import '../models/review_models.dart';
import '../models/vocabulary_item.dart';
import 'queue_selector.dart';

class StudyCardCacheEntry {
  StudyCardCacheEntry({
    required this.vocabulary,
    required this.repetition,
    required this.intervalDays,
    required this.easeFactor,
    required this.dueDate,
    required this.lastReviewed,
    required this.lastQuality,
    required this.lapses,
  });

  final VocabularyItem vocabulary;
  int repetition;
  int intervalDays;
  double easeFactor;
  DateTime? dueDate;
  DateTime? lastReviewed;
  int lastQuality;
  int lapses;

  FlashcardEntry toFlashcardEntry() {
    if (dueDate == null) {
      return FlashcardEntry(vocabulary: vocabulary, reviewState: null);
    }

    return FlashcardEntry(
      vocabulary: vocabulary,
      reviewState: ReviewState(
        vocabId: vocabulary.id,
        repetition: repetition,
        intervalDays: intervalDays,
        easeFactor: easeFactor,
        dueDate: dueDate!,
        lastReviewed: lastReviewed ?? DateTime.fromMillisecondsSinceEpoch(0),
        lastQuality: lastQuality,
        lapses: lapses,
      ),
    );
  }
}

class StudyCardCache {
  final Map<int, List<StudyCardCacheEntry>> _entriesByLevel = {};
  final Map<int, StudyCardCacheEntry> _entryByVocabId = {};

  bool hasLevel(int level) => _entriesByLevel.containsKey(level);

  void putLevelEntries(int level, List<StudyCardCacheEntry> entries) {
    _entriesByLevel[level] = entries;
    for (final entry in entries) {
      _entryByVocabId[entry.vocabulary.id] = entry;
    }
  }

  FlashcardEntry? nextCard({
    required int level,
    required Set<int> seenIds,
    required DateTime now,
    required QueueSelector selector,
    required StudyQueueMode mode,
  }) {
    final entries = _entriesByLevel[level];
    if (entries == null || entries.isEmpty) {
      return null;
    }

    final filteredEntries = _entriesForMode(entries, mode);

    if (filteredEntries.isEmpty) {
      return null;
    }

    if (mode != StudyQueueMode.all) {
      for (final entry in filteredEntries) {
        if (!seenIds.contains(entry.vocabulary.id)) {
          return entry.toFlashcardEntry();
        }
      }
      return null;
    }

    final candidates = filteredEntries
        .map((entry) => QueueCandidate(vocabId: entry.vocabulary.id, dueDate: entry.dueDate))
        .toList();

    final selected = selector.nextCandidate(candidates: candidates, seenVocabIds: seenIds, now: now);
    if (selected == null) {
      return null;
    }

    return _entryByVocabId[selected.vocabId]?.toFlashcardEntry();
  }

  List<FlashcardEntry> cardsForMode({
    required int level,
    required StudyQueueMode mode,
  }) {
    final entries = _entriesByLevel[level];
    if (entries == null || entries.isEmpty) {
      return const [];
    }

    return _entriesForMode(entries, mode)
        .map((entry) => entry.toFlashcardEntry())
        .toList();
  }

  FlashcardEntry? cardByVocabId(int vocabId) {
    return _entryByVocabId[vocabId]?.toFlashcardEntry();
  }

  void applyReviewResult({
    required int vocabId,
    required int repetition,
    required int intervalDays,
    required double easeFactor,
    required DateTime dueDate,
    required DateTime lastReviewed,
    required int lastQuality,
    required int lapses,
  }) {
    final entry = _entryByVocabId[vocabId];
    if (entry == null) {
      return;
    }

    entry.repetition = repetition;
    entry.intervalDays = intervalDays;
    entry.easeFactor = easeFactor;
    entry.dueDate = dueDate;
    entry.lastReviewed = lastReviewed;
    entry.lastQuality = lastQuality;
    entry.lapses = lapses;
  }

  void clear() {
    _entriesByLevel.clear();
    _entryByVocabId.clear();
  }

  List<StudyCardCacheEntry> _entriesForMode(
    List<StudyCardCacheEntry> entries,
    StudyQueueMode mode,
  ) {
    return entries.where((entry) {
      switch (mode) {
        case StudyQueueMode.all:
          return true;
        case StudyQueueMode.known:
          return entry.lastQuality >= 4;
        case StudyQueueMode.newWords:
          return entry.dueDate == null;
        case StudyQueueMode.notLearned:
          return entry.dueDate != null && entry.lastQuality <= 2;
        case StudyQueueMode.notSure:
          return entry.lastQuality == 3;
      }
    }).toList();
  }
}
