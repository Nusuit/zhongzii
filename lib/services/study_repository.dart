import 'dart:async';

import 'package:sqflite/sqflite.dart';

import '../data/hsk_vocab_data.dart';
import '../models/review_models.dart';
import '../models/vocabulary_item.dart';
import 'chunking.dart';
import 'local_database.dart';
import 'queue_selector.dart';
import 'sm2_scheduler.dart';
import 'study_card_cache.dart';
import 'sync_service.dart';

class StudyRepository {
  StudyRepository(this._database, {SyncService? syncService})
      : _scheduler = Sm2Scheduler(),
        _queueSelector = QueueSelector(),
        _cache = StudyCardCache(),
        _syncService = syncService;

  final LocalDatabase _database;
  final Sm2Scheduler _scheduler;
  final QueueSelector _queueSelector;
  final StudyCardCache _cache;
  final SyncService? _syncService;

  Future<void> seedHardcodedVocabulary({
    int chunkSize = 400,
    void Function(int inserted, int total)? onProgress,
  }) async {
    final db = await _database.instance;
    final existing = Sqflite.firstIntValue(await db.rawQuery('SELECT COUNT(*) FROM vocabularies'));
    if ((existing ?? 0) > 0) {
      onProgress?.call(hardcodedVocabulary.length, hardcodedVocabulary.length);
      return;
    }

    final ranges = chunkRanges(hardcodedVocabulary.length, chunkSize);
    var inserted = 0;

    for (final range in ranges) {
      final batch = db.batch();
      for (var i = range.start; i < range.endExclusive; i++) {
        final record = hardcodedVocabulary[i];
        batch.insert(
          'vocabularies',
          {
            'level': record.level,
            'hanzi': record.hanzi,
            'pinyin': record.pinyin,
            'meaning': record.meaning,
            'example': record.example,
          },
          conflictAlgorithm: ConflictAlgorithm.ignore,
        );
      }

      await batch.commit(noResult: true);
      inserted = range.endExclusive;
      onProgress?.call(inserted, hardcodedVocabulary.length);

      // Yield once per chunk so first-launch UI remains responsive.
      await Future<void>.delayed(Duration.zero);
    }

    _cache.clear();

    // Background sync: upload vocab to Supabase (first launch), then pull
    // any review states updated on the web.
    unawaited(_syncService?.seedVocabulariesToSupabase());
    unawaited(_syncService?.pullLatestReviewStates());
  }

  Future<List<int>> importedLevels() async {
    final db = await _database.instance;
    final rows = await db.rawQuery('SELECT DISTINCT level FROM vocabularies ORDER BY level ASC');
    return rows.map((row) => row['level'] as int).toList();
  }

  Future<int> wordCountByLevel(int level) async {
    final db = await _database.instance;
    final row = Sqflite.firstIntValue(
      await db.rawQuery('SELECT COUNT(*) FROM vocabularies WHERE level = ?', [level]),
    );
    return row ?? 0;
  }

  Future<void> preloadLevelCache(int level) async {
    if (_cache.hasLevel(level)) {
      return;
    }

    final db = await _database.instance;
    final rows = await db.rawQuery('''
      SELECT
        v.id,
        v.level,
        v.hanzi,
        v.pinyin,
        v.meaning,
        v.example,
        rs.repetition,
        rs.interval_days,
        rs.ease_factor,
        rs.due_date,
        rs.last_reviewed,
        rs.last_quality,
        rs.lapses
      FROM vocabularies v
      LEFT JOIN review_states rs ON rs.vocab_id = v.id
      WHERE v.level = ?
      ORDER BY v.id ASC
    ''', [level]);

    final entries = rows.map(_rowToCacheEntry).toList();
    _cache.putLevelEntries(level, entries);
  }

  Future<FlashcardEntry?> nextCard(int level, Set<int> seenIds) async {
    if (!_cache.hasLevel(level)) {
      await preloadLevelCache(level);
    }

    return _cache.nextCard(
      level: level,
      seenIds: seenIds,
      now: DateTime.now(),
      selector: _queueSelector,
      mode: StudyQueueMode.all,
    );
  }

  Future<FlashcardEntry?> nextCardForMode({
    required int level,
    required Set<int> seenIds,
    required StudyQueueMode mode,
  }) async {
    if (!_cache.hasLevel(level)) {
      await preloadLevelCache(level);
    }

    return _cache.nextCard(
      level: level,
      seenIds: seenIds,
      now: DateTime.now(),
      selector: _queueSelector,
      mode: mode,
    );
  }

  Future<List<FlashcardEntry>> cardsForMode({
    required int level,
    required StudyQueueMode mode,
  }) async {
    if (!_cache.hasLevel(level)) {
      await preloadLevelCache(level);
    }

    return _cache.cardsForMode(level: level, mode: mode);
  }

  FlashcardEntry? cachedCardByVocabId(int vocabId) {
    return _cache.cardByVocabId(vocabId);
  }

  Future<void> reviewCard({required int vocabId, required ReviewAnswer answer}) async {
    final db = await _database.instance;
    final current = await db.query(
      'review_states',
      where: 'vocab_id = ?',
      whereArgs: [vocabId],
      limit: 1,
    );

    final quality = _mapAnswerToQuality(answer);
    final now = DateTime.now();
    final repetition = current.isEmpty ? 0 : (current.first['repetition'] as int? ?? 0);
    final intervalDays = current.isEmpty ? 0 : (current.first['interval_days'] as int? ?? 0);
    final lastQuality = current.isEmpty ? 0 : (current.first['last_quality'] as int? ?? 0);
    final lapses = current.isEmpty ? 0 : (current.first['lapses'] as int? ?? 0);
    final easeFactor = current.isEmpty
        ? 2.5
        : (current.first['ease_factor'] as num? ?? 2.5).toDouble();

    final wasKnown = lastQuality >= 4 || repetition >= 2;
    final isHardFailure = answer == ReviewAnswer.hard;
    final nextLapses = isHardFailure ? lapses + 1 : answer == ReviewAnswer.known ? 0 : lapses;
    final effectiveQuality = isHardFailure && wasKnown ? 0 : quality;

    final lapsePenalty = (0.12 * nextLapses).clamp(0.0, 0.8).toDouble();
    final adjustedEaseFactor = isHardFailure && wasKnown
      ? (easeFactor - 0.25 - lapsePenalty).clamp(1.3, 2.5).toDouble()
      : easeFactor;

    final result = _scheduler.schedule(
      Sm2Input(
        quality: effectiveQuality,
        currentRepetition: repetition,
        currentIntervalDays: intervalDays,
        currentEaseFactor: adjustedEaseFactor,
        now: now,
      ),
    );

    await db.insert(
      'review_states',
      {
        'vocab_id': vocabId,
        'repetition': result.repetition,
        'interval_days': result.intervalDays,
        'ease_factor': result.easeFactor,
        'due_date': result.dueDate.toIso8601String(),
        'last_reviewed': now.toIso8601String(),
        'last_quality': effectiveQuality,
        'lapses': nextLapses,
      },
      conflictAlgorithm: ConflictAlgorithm.replace,
    );

    final today = DateTime(now.year, now.month, now.day).toIso8601String();
    await db.insert(
      'study_sessions',
      {
        'study_date': today,
        'reviewed_count': 0,
        'accessed_count': 0,
        'known_count': 0,
        'unknown_count': 0,
        'hard_count': 0,
      },
      conflictAlgorithm: ConflictAlgorithm.ignore,
    );
    final answerColumn = switch (answer) {
      ReviewAnswer.known => 'known_count',
      ReviewAnswer.unknown => 'unknown_count',
      ReviewAnswer.hard => 'hard_count',
    };
    await db.rawUpdate(
      'UPDATE study_sessions SET reviewed_count = reviewed_count + 1, $answerColumn = $answerColumn + 1 WHERE study_date = ?',
      [today],
    );

    _cache.applyReviewResult(
      vocabId: vocabId,
      repetition: result.repetition,
      intervalDays: result.intervalDays,
      easeFactor: result.easeFactor,
      dueDate: result.dueDate,
      lastReviewed: now,
      lastQuality: effectiveQuality,
      lapses: nextLapses,
    );

    // Sync review state to Supabase (fire & forget).
    unawaited(_syncService?.upsertReviewState(
      vocabId: vocabId,
      repetition: result.repetition,
      intervalDays: result.intervalDays,
      easeFactor: result.easeFactor,
      dueDate: result.dueDate,
      lastReviewed: now,
      lastQuality: effectiveQuality,
      lapses: nextLapses,
    ));

    // Sync today's study session to Supabase.
    final sessionRow = await db.query(
      'study_sessions',
      where: 'study_date = ?',
      whereArgs: [today],
      limit: 1,
    );
    if (sessionRow.isNotEmpty) {
      unawaited(_syncService?.upsertStudySession(
        studyDate: today,
        reviewedCount: (sessionRow.first['reviewed_count'] as int?) ?? 0,
        accessedCount: (sessionRow.first['accessed_count'] as int?) ?? 0,
        knownCount: (sessionRow.first['known_count'] as int?) ?? 0,
        unknownCount: (sessionRow.first['unknown_count'] as int?) ?? 0,
        hardCount: (sessionRow.first['hard_count'] as int?) ?? 0,
      ));
    }
  }

  Future<void> recordDailyAccess() async {
    final db = await _database.instance;
    final now = DateTime.now();
    final today = DateTime(now.year, now.month, now.day).toIso8601String();

    await db.insert(
      'study_sessions',
      {
        'study_date': today,
        'reviewed_count': 0,
        'accessed_count': 0,
        'known_count': 0,
        'unknown_count': 0,
        'hard_count': 0,
      },
      conflictAlgorithm: ConflictAlgorithm.ignore,
    );
    await db.rawUpdate(
      'UPDATE study_sessions SET accessed_count = accessed_count + 1 WHERE study_date = ?',
      [today],
    );

    final sessionRow = await db.query(
      'study_sessions',
      where: 'study_date = ?',
      whereArgs: [today],
      limit: 1,
    );
    if (sessionRow.isNotEmpty) {
      unawaited(_syncService?.upsertStudySession(
        studyDate: today,
        reviewedCount: (sessionRow.first['reviewed_count'] as int?) ?? 0,
        accessedCount: (sessionRow.first['accessed_count'] as int?) ?? 0,
        knownCount: (sessionRow.first['known_count'] as int?) ?? 0,
        unknownCount: (sessionRow.first['unknown_count'] as int?) ?? 0,
        hardCount: (sessionRow.first['hard_count'] as int?) ?? 0,
      ));
    }
  }

  Future<DashboardStats> dashboardStats({int? level}) async {
    final db = await _database.instance;
    final params = <Object?>[];
    var totalsQuery = '''
      SELECT
        SUM(CASE WHEN rs.last_quality >= 4 THEN 1 ELSE 0 END) AS known,
        SUM(CASE WHEN rs.last_quality = 3 THEN 1 ELSE 0 END) AS unknown,
        SUM(CASE WHEN rs.vocab_id IS NOT NULL AND rs.last_quality <= 2 THEN 1 ELSE 0 END) AS hard,
        SUM(CASE WHEN rs.vocab_id IS NULL THEN 1 ELSE 0 END) AS new_words
      FROM vocabularies v
      LEFT JOIN review_states rs ON rs.vocab_id = v.id
    ''';

    if (level != null) {
      totalsQuery += ' WHERE v.level = ?';
      params.add(level);
    }

    final totals = await db.rawQuery(totalsQuery, params);

    final sessions = await db.rawQuery('''
      SELECT
        study_date,
        reviewed_count,
        accessed_count,
        known_count,
        unknown_count,
        hard_count
      FROM study_sessions
      ORDER BY study_date DESC
      LIMIT 21
    ''');
    final days = <DateTime>{};
    final activity = <StudyActivityPoint>[];
    for (final row in sessions.reversed) {
      final date = DateTime.parse(row['study_date'] as String);
      final reviewedCount = (row['reviewed_count'] as int?) ?? 0;
      final accessedCount = (row['accessed_count'] as int?) ?? 0;
      final knownCount = (row['known_count'] as int?) ?? 0;
      final unknownCount = (row['unknown_count'] as int?) ?? 0;
      final hardCount = (row['hard_count'] as int?) ?? 0;

      activity.add(
        StudyActivityPoint(
          date: date,
          reviewedCount: reviewedCount,
          accessedCount: accessedCount,
          knownCount: knownCount,
          unknownCount: unknownCount,
          hardCount: hardCount,
        ),
      );

      if (reviewedCount > 0 || accessedCount > 0) {
        days.add(date);
      }
    }

    final row = totals.first;
    return DashboardStats(
      known: (row['known'] as int?) ?? 0,
      unknown: (row['unknown'] as int?) ?? 0,
      hard: (row['hard'] as int?) ?? 0,
      newWords: (row['new_words'] as int?) ?? 0,
      studyDays: days,
      activity: activity,
    );
  }

  int _mapAnswerToQuality(ReviewAnswer answer) {
    switch (answer) {
      case ReviewAnswer.known:
        return 5;
      case ReviewAnswer.unknown:
        return 3;
      case ReviewAnswer.hard:
        return 1;
    }
  }

  StudyCardCacheEntry _rowToCacheEntry(Map<String, Object?> row) {
    final vocabulary = VocabularyItem(
      id: row['id'] as int,
      level: row['level'] as int,
      hanzi: row['hanzi'] as String,
      pinyin: (row['pinyin'] as String?) ?? '',
      meaning: row['meaning'] as String,
      example: (row['example'] as String?) ?? '',
    );

    return StudyCardCacheEntry(
      vocabulary: vocabulary,
      repetition: (row['repetition'] as int?) ?? 0,
      intervalDays: (row['interval_days'] as int?) ?? 0,
      easeFactor: (row['ease_factor'] as num?)?.toDouble() ?? 2.5,
      dueDate: row['due_date'] == null ? null : DateTime.parse(row['due_date'] as String),
      lastReviewed:
          row['last_reviewed'] == null ? null : DateTime.parse(row['last_reviewed'] as String),
      lastQuality: (row['last_quality'] as int?) ?? 0,
      lapses: (row['lapses'] as int?) ?? 0,
    );
  }
}
