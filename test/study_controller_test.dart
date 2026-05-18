import 'package:flutter_test/flutter_test.dart';
import 'package:zhongzii_flashcards/controllers/study_controller.dart';
import 'package:zhongzii_flashcards/models/review_models.dart';
import 'package:zhongzii_flashcards/models/vocabulary_item.dart';
import 'package:zhongzii_flashcards/services/notification_service.dart';
import 'package:zhongzii_flashcards/services/study_repository.dart';

class FakeNotificationService implements NotificationService {
  int reminderCalls = 0;

  @override
  Future<void> initialize() async {}

  @override
  Future<void> scheduleDaily8amReminder() async {
    reminderCalls += 1;
  }
}

class ReviewCall {
  ReviewCall(this.vocabId, this.answer);

  final int vocabId;
  final ReviewAnswer answer;
}

class NextCardCall {
  NextCardCall(this.level, this.mode, this.seenIds);

  final int level;
  final StudyQueueMode mode;
  final Set<int> seenIds;
}

class FakeStudyRepository implements StudyRepository {
  FakeStudyRepository({
    required this.importedLevelsValue,
    required this.wordCounts,
    required this.allStats,
    required this.statsByLevel,
    required this.poolCards,
    required this.nextCardQueue,
  });

  final List<int> importedLevelsValue;
  final Map<int, int> wordCounts;
  final DashboardStats allStats;
  final Map<int, DashboardStats> statsByLevel;
  final List<FlashcardEntry> poolCards;
  final List<FlashcardEntry?> nextCardQueue;

  bool seeded = false;
  bool dailyAccessRecorded = false;
  final List<int> preloadCalls = <int>[];
  final List<ReviewCall> reviewCalls = <ReviewCall>[];
  final List<NextCardCall> nextCardCalls = <NextCardCall>[];

  @override
  Future<void> seedHardcodedVocabulary({
    int chunkSize = 400,
    void Function(int inserted, int total)? onProgress,
  }) async {
    seeded = true;
    onProgress?.call(1, 1);
  }

  @override
  Future<List<int>> importedLevels() async => importedLevelsValue;

  @override
  Future<int> wordCountByLevel(int level) async => wordCounts[level] ?? 0;

  @override
  Future<void> preloadLevelCache(int level) async {
    preloadCalls.add(level);
  }

  @override
  Future<FlashcardEntry?> nextCard(int level, Set<int> seenIds) async {
    return _popNextCard(level, StudyQueueMode.all, seenIds);
  }

  @override
  Future<FlashcardEntry?> nextCardForMode({
    required int level,
    required Set<int> seenIds,
    required StudyQueueMode mode,
  }) async {
    return _popNextCard(level, mode, seenIds);
  }

  FlashcardEntry? _popNextCard(int level, StudyQueueMode mode, Set<int> seenIds) {
    nextCardCalls.add(NextCardCall(level, mode, seenIds));
    if (nextCardQueue.isEmpty) {
      return null;
    }
    return nextCardQueue.removeAt(0);
  }

  @override
  Future<List<FlashcardEntry>> cardsForMode({
    required int level,
    required StudyQueueMode mode,
  }) async {
    return poolCards;
  }

  @override
  FlashcardEntry? cachedCardByVocabId(int vocabId) {
    for (final card in poolCards) {
      if (card.vocabulary.id == vocabId) {
        return card;
      }
    }
    return null;
  }

  @override
  Future<void> reviewCard({required int vocabId, required ReviewAnswer answer}) async {
    reviewCalls.add(ReviewCall(vocabId, answer));
  }

  @override
  Future<void> recordDailyAccess() async {
    dailyAccessRecorded = true;
  }

  @override
  Future<DashboardStats> dashboardStats({int? level}) async {
    if (level == null) {
      return allStats;
    }
    return statsByLevel[level] ?? allStats;
  }
}

void main() {
  group('StudyController', () {
    test('bootstrap seeds data, loads stats, and schedules reminder', () async {
      final allStats = DashboardStats(
        known: 5,
        unknown: 2,
        hard: 1,
        newWords: 10,
        studyDays: {DateTime(2026, 5, 10)},
        activity: const [],
      );
      final levelStats = DashboardStats(
        known: 2,
        unknown: 1,
        hard: 0,
        newWords: 4,
        studyDays: {DateTime(2026, 5, 10)},
        activity: const [],
      );
      final repository = FakeStudyRepository(
        importedLevelsValue: const [1, 2],
        wordCounts: const {1: 10, 2: 20, 3: 0, 4: 0, 5: 0, 6: 0},
        allStats: allStats,
        statsByLevel: {1: levelStats, 2: levelStats},
        poolCards: const [],
        nextCardQueue: <FlashcardEntry?>[],
      );
      final notifications = FakeNotificationService();
      final controller = StudyController(
        repository: repository,
        notificationService: notifications,
      );

      await controller.bootstrap();

      expect(repository.seeded, isTrue);
      expect(repository.dailyAccessRecorded, isTrue);
      expect(controller.loading, isFalse);
      expect(controller.error, isNull);
      expect(controller.seedProgress, 1);
      expect(controller.importedLevels, const [1, 2]);
      expect(controller.levelWordCounts[1], 10);
      expect(controller.levelWordCounts[6], 0);
      expect(controller.stats.known, allStats.known);
      expect(controller.stats.newWords, allStats.newWords);
      expect(controller.dashboardStatsByLevel.containsKey(null), isTrue);
      expect(controller.dashboardStatsByLevel.containsKey(1), isTrue);
      expect(notifications.reminderCalls, 1);
    });

    test('startLevel loads pool and next card', () async {
      final card = FlashcardEntry(
        vocabulary: const VocabularyItem(
          id: 100,
          level: 2,
          hanzi: '学',
          pinyin: 'xue',
          meaning: 'hoc',
          example: '',
        ),
        reviewState: null,
      );
      final repository = FakeStudyRepository(
        importedLevelsValue: const [1],
        wordCounts: const {1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0},
        allStats: const DashboardStats(
          known: 0,
          unknown: 0,
          hard: 0,
          newWords: 0,
          studyDays: <DateTime>{},
          activity: <StudyActivityPoint>[],
        ),
        statsByLevel: const {},
        poolCards: [card],
        nextCardQueue: [card],
      );
      final controller = StudyController(
        repository: repository,
        notificationService: FakeNotificationService(),
      );

      await controller.startLevel(2, mode: StudyQueueMode.notLearned);

      expect(controller.currentLevel, 2);
      expect(controller.currentStudyMode, StudyQueueMode.notLearned);
      expect(controller.currentPoolCards.length, 1);
      expect(controller.currentCard?.vocabulary.id, 100);
      expect(repository.preloadCalls, contains(2));
    });

    test('answerCurrentCard records review and advances', () async {
      final firstCard = FlashcardEntry(
        vocabulary: const VocabularyItem(
          id: 10,
          level: 1,
          hanzi: '你',
          pinyin: 'ni',
          meaning: 'ban',
          example: '',
        ),
        reviewState: null,
      );
      final secondCard = FlashcardEntry(
        vocabulary: const VocabularyItem(
          id: 11,
          level: 1,
          hanzi: '好',
          pinyin: 'hao',
          meaning: 'tot',
          example: '',
        ),
        reviewState: null,
      );
      final repository = FakeStudyRepository(
        importedLevelsValue: const [1],
        wordCounts: const {1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0},
        allStats: const DashboardStats(
          known: 0,
          unknown: 0,
          hard: 0,
          newWords: 0,
          studyDays: <DateTime>{},
          activity: <StudyActivityPoint>[],
        ),
        statsByLevel: const {},
        poolCards: [firstCard, secondCard],
        nextCardQueue: [firstCard, secondCard],
      );
      final controller = StudyController(
        repository: repository,
        notificationService: FakeNotificationService(),
      );

      await controller.startLevel(1);
      await controller.answerCurrentCard(ReviewAnswer.known);

      expect(repository.reviewCalls.length, 1);
      expect(repository.reviewCalls.first.vocabId, 10);
      expect(repository.reviewCalls.first.answer, ReviewAnswer.known);
      expect(controller.currentCard?.vocabulary.id, 11);
    });
  });
}
