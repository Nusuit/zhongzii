import 'package:sqflite/sqflite.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import 'local_database.dart';
import 'supabase_service.dart';

class SyncService {
  SyncService(this._database);

  final LocalDatabase _database;

  // Upload all vocabularies to Supabase once (skips if already done).
  Future<void> seedVocabulariesToSupabase() async {
    try {
      final countRes = await SupabaseService.client
          .from('vocabularies')
          .select('id')
          .limit(1);
      if ((countRes as List).isNotEmpty) return;

      final db = await _database.instance;
      final rows = await db.query('vocabularies', orderBy: 'id ASC');
      if (rows.isEmpty) return;

      const batchSize = 400;
      for (var i = 0; i < rows.length; i += batchSize) {
        final end = (i + batchSize).clamp(0, rows.length);
        await SupabaseService.client.from('vocabularies').upsert(
          rows.sublist(i, end).map((r) => {
                'id': r['id'],
                'level': r['level'],
                'hanzi': r['hanzi'],
                'pinyin': r['pinyin'],
                'meaning': r['meaning'],
                'example': r['example'],
              }).toList(),
        );
      }
    } catch (_) {
      // Fail silently — offline or misconfigured keys.
    }
  }

  // Push a single review state to Supabase after each card review.
  Future<void> upsertReviewState({
    required int vocabId,
    required int repetition,
    required int intervalDays,
    required double easeFactor,
    required DateTime dueDate,
    required DateTime lastReviewed,
    required int lastQuality,
    required int lapses,
  }) async {
    try {
      await SupabaseService.client.from('review_states').upsert({
        'vocab_id': vocabId,
        'repetition': repetition,
        'interval_days': intervalDays,
        'ease_factor': easeFactor,
        'due_date': dueDate.toIso8601String(),
        'last_reviewed': lastReviewed.toIso8601String(),
        'last_quality': lastQuality,
        'lapses': lapses,
        'updated_at': DateTime.now().toUtc().toIso8601String(),
      });
    } catch (_) {}
  }

  // Push a study session to Supabase (full row, not delta).
  Future<void> upsertStudySession({
    required String studyDate,
    required int reviewedCount,
    required int accessedCount,
    required int knownCount,
    required int unknownCount,
    required int hardCount,
  }) async {
    try {
      await SupabaseService.client.from('study_sessions').upsert({
        'study_date': studyDate,
        'reviewed_count': reviewedCount,
        'accessed_count': accessedCount,
        'known_count': knownCount,
        'unknown_count': unknownCount,
        'hard_count': hardCount,
      });
    } catch (_) {}
  }

  // Pull all review states from Supabase on startup.
  // Supabase wins when its last_reviewed is more recent than the local value.
  Future<void> pullLatestReviewStates() async {
    try {
      final supRows = await SupabaseService.client.from('review_states').select() as List;
      if (supRows.isEmpty) return;

      final db = await _database.instance;
      final localRows = await db.query('review_states');
      final localTimestamps = <int, DateTime?>{
        for (final r in localRows)
          r['vocab_id'] as int:
              DateTime.tryParse((r['last_reviewed'] as String?) ?? ''),
      };

      final batch = db.batch();
      for (final row in supRows) {
        final vocabId = row['vocab_id'] as int;
        final supLastReviewed =
            DateTime.tryParse((row['last_reviewed'] as String?) ?? '');
        final localLastReviewed = localTimestamps[vocabId];

        if (supLastReviewed != null &&
            (localLastReviewed == null ||
                supLastReviewed.isAfter(localLastReviewed))) {
          batch.insert(
            'review_states',
            {
              'vocab_id': vocabId,
              'repetition': row['repetition'],
              'interval_days': row['interval_days'],
              'ease_factor': row['ease_factor'],
              'due_date': row['due_date'],
              'last_reviewed': row['last_reviewed'],
              'last_quality': row['last_quality'],
              'lapses': row['lapses'],
            },
            conflictAlgorithm: ConflictAlgorithm.replace,
          );
        }
      }
      await batch.commit(noResult: true);
    } catch (_) {}
  }
}
