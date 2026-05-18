import 'package:flutter/foundation.dart';

import '../models/review_models.dart';
import '../services/notification_service.dart';
import '../services/study_repository.dart';

class StudyController extends ChangeNotifier {
  StudyController({
    required StudyRepository repository,
    required NotificationService notificationService,
  }) : _repository = repository,
       _notificationService = notificationService;

  final StudyRepository _repository;
  final NotificationService _notificationService;

  bool loading = true;
  String? error;
  DashboardStats stats = const DashboardStats(
    known: 0,
    unknown: 0,
    hard: 0,
    newWords: 0,
    studyDays: <DateTime>{},
    activity: <StudyActivityPoint>[],
  );
  final Map<int?, DashboardStats> dashboardStatsByLevel = {};
  int? selectedDashboardLevel;
  List<int> importedLevels = const [];
  final Map<int, int> levelWordCounts = {};
  double seedProgress = 0;

  FlashcardEntry? currentCard;
  List<FlashcardEntry> currentPoolCards = const [];
  int currentLevel = 1;
  StudyQueueMode currentStudyMode = StudyQueueMode.all;
  final Set<int> _sessionSeenIds = <int>{};

  Future<void> bootstrap() async {
    try {
      loading = true;
      seedProgress = 0;
      error = null;
      notifyListeners();

      await _repository.seedHardcodedVocabulary(
        onProgress: (inserted, total) {
          seedProgress = total == 0 ? 1 : inserted / total;
          notifyListeners();
        },
      );
      seedProgress = 1;

      await _repository.recordDailyAccess();

      importedLevels = await _repository.importedLevels();

      for (var level = 1; level <= 6; level++) {
        levelWordCounts[level] = await _repository.wordCountByLevel(level);
      }

      if (importedLevels.isEmpty) {
        throw StateError('Không tìm thấy dữ liệu từ vựng sau khi seed.');
      }

      await _refreshDashboardStats(includeAllLevels: true);

      // Reminder setup should not block app data bootstrap.
      try {
        await _notificationService.scheduleDaily8amReminder();
      } catch (_) {}

      loading = false;
      notifyListeners();
    } catch (e) {
      loading = false;
      error = e.toString();
      notifyListeners();
    }
  }

  Future<void> startLevel(
    int level, {
    StudyQueueMode mode = StudyQueueMode.all,
  }) async {
    currentLevel = level;
    currentStudyMode = mode;
    _sessionSeenIds.clear();
    await _repository.preloadLevelCache(level);
    await _refreshCurrentPoolCards();
    await _loadNextCard();
  }

  Future<void> answerCurrentCard(ReviewAnswer answer) async {
    final card = currentCard;
    if (card == null) {
      return;
    }

    final vocabId = card.vocabulary.id;
    await _repository.reviewCard(vocabId: vocabId, answer: answer);

    _sessionSeenIds.add(vocabId);

    await _refreshCurrentPoolCards();
    await _loadNextCard();
    await _refreshDashboardStats();
    notifyListeners();
  }

  Future<void> jumpToCard(int vocabId) async {
    final index = currentPoolCards.indexWhere(
      (card) => card.vocabulary.id == vocabId,
    );
    if (index > 0) {
      _sessionSeenIds.addAll(
        currentPoolCards
            .take(index)
            .map((card) => card.vocabulary.id),
      );
    }
    currentCard = _repository.cachedCardByVocabId(vocabId);
    notifyListeners();
  }

  Future<void> updateDashboardLevel(int? level) async {
    selectedDashboardLevel = level;
    final cachedStats = dashboardStatsByLevel[level];
    if (cachedStats != null) {
      stats = cachedStats;
      notifyListeners();
    }

    final freshStats = await _repository.dashboardStats(level: level);
    dashboardStatsByLevel[level] = freshStats;
    stats = freshStats;
    notifyListeners();
  }

  Future<void> _refreshDashboardStats({bool includeAllLevels = false}) async {
    if (includeAllLevels) {
      dashboardStatsByLevel.clear();
    }

    final allStats = await _repository.dashboardStats();
    dashboardStatsByLevel[null] = allStats;

    if (includeAllLevels) {
      for (final level in importedLevels) {
        dashboardStatsByLevel[level] = await _repository.dashboardStats(
          level: level,
        );
      }
    } else if (selectedDashboardLevel != null) {
      dashboardStatsByLevel[selectedDashboardLevel] =
          await _repository.dashboardStats(level: selectedDashboardLevel);
    }

    stats = dashboardStatsByLevel[selectedDashboardLevel] ?? allStats;
  }

  Future<void> _loadNextCard() async {
    currentCard = await _repository.nextCardForMode(
      level: currentLevel,
      seenIds: _sessionSeenIds,
      mode: currentStudyMode,
    );
    notifyListeners();
  }

  Future<void> _refreshCurrentPoolCards() async {
    currentPoolCards = await _repository.cardsForMode(
      level: currentLevel,
      mode: currentStudyMode,
    );
  }
}
