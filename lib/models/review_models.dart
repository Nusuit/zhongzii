import 'vocabulary_item.dart';

enum ReviewAnswer { known, unknown, hard }

enum StudyQueueMode { all, known, newWords, notLearned, notSure }

extension StudyQueueModeText on StudyQueueMode {
  String get label {
    switch (this) {
      case StudyQueueMode.all:
        return 'Học tất cả';
      case StudyQueueMode.known:
        return 'Đã thuộc';
      case StudyQueueMode.newWords:
        return 'Từ mới';
      case StudyQueueMode.notLearned:
        return 'Không thuộc';
      case StudyQueueMode.notSure:
        return 'Chưa chắc';
    }
  }

  String get shortLabel {
    switch (this) {
      case StudyQueueMode.all:
        return 'Tất cả';
      case StudyQueueMode.known:
        return 'Đã thuộc';
      case StudyQueueMode.newWords:
        return 'Từ mới';
      case StudyQueueMode.notLearned:
        return 'Không thuộc';
      case StudyQueueMode.notSure:
        return 'Chưa chắc';
    }
  }
}

class ReviewState {
  const ReviewState({
    required this.vocabId,
    required this.repetition,
    required this.intervalDays,
    required this.easeFactor,
    required this.dueDate,
    required this.lastReviewed,
    required this.lastQuality,
    required this.lapses,
  });

  final int vocabId;
  final int repetition;
  final int intervalDays;
  final double easeFactor;
  final DateTime dueDate;
  final DateTime lastReviewed;
  final int lastQuality;
  final int lapses;
}

class FlashcardEntry {
  const FlashcardEntry({required this.vocabulary, this.reviewState});

  final VocabularyItem vocabulary;
  final ReviewState? reviewState;
}

class StudyActivityPoint {
  const StudyActivityPoint({
    required this.date,
    required this.reviewedCount,
    required this.accessedCount,
    required this.knownCount,
    required this.unknownCount,
    required this.hardCount,
  });

  final DateTime date;
  final int reviewedCount;
  final int accessedCount;
  final int knownCount;
  final int unknownCount;
  final int hardCount;
}

class DashboardStats {
  const DashboardStats({
    required this.known,
    required this.unknown,
    required this.hard,
    required this.newWords,
    required this.studyDays,
    required this.activity,
  });

  final int known;
  final int unknown;
  final int hard;
  final int newWords;
  final Set<DateTime> studyDays;
  final List<StudyActivityPoint> activity;
}
