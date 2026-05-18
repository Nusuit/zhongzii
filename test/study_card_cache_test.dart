import 'package:flutter_test/flutter_test.dart';
import 'package:zhongzii_flashcards/models/review_models.dart';
import 'package:zhongzii_flashcards/models/vocabulary_item.dart';
import 'package:zhongzii_flashcards/services/queue_selector.dart';
import 'package:zhongzii_flashcards/services/study_card_cache.dart';

void main() {
  group('StudyCardCache', () {
    test('returns due card and skips seen ids', () {
      final cache = StudyCardCache();
      final selector = QueueSelector();

      cache.putLevelEntries(1, [
        StudyCardCacheEntry(
          vocabulary: const VocabularyItem(
            id: 1,
            level: 1,
            hanzi: '爱',
            pinyin: 'ai',
            meaning: 'yeu',
            example: '',
          ),
          repetition: 1,
          intervalDays: 1,
          easeFactor: 2.5,
          dueDate: DateTime(2026, 4, 19),
          lastReviewed: DateTime(2026, 4, 18),
          lastQuality: 5,
          lapses: 0,
        ),
        StudyCardCacheEntry(
          vocabulary: const VocabularyItem(
            id: 2,
            level: 1,
            hanzi: '八',
            pinyin: 'ba',
            meaning: 'tam',
            example: '',
          ),
          repetition: 0,
          intervalDays: 0,
          easeFactor: 2.5,
          dueDate: null,
          lastReviewed: null,
          lastQuality: 0,
          lapses: 0,
        ),
      ]);

      final card = cache.nextCard(
        level: 1,
        seenIds: {1},
        now: DateTime(2026, 4, 20),
        selector: selector,
        mode: StudyQueueMode.all,
      );

      expect(card, isNotNull);
      expect(card!.vocabulary.id, 2);
    });

    test('updates cached review state after answer', () {
      final cache = StudyCardCache();
      final selector = QueueSelector();

      cache.putLevelEntries(1, [
        StudyCardCacheEntry(
          vocabulary: const VocabularyItem(
            id: 11,
            level: 1,
            hanzi: '爸爸',
            pinyin: 'baba',
            meaning: 'bo',
            example: '',
          ),
          repetition: 0,
          intervalDays: 0,
          easeFactor: 2.5,
          dueDate: null,
          lastReviewed: null,
          lastQuality: 0,
          lapses: 0,
        ),
      ]);

      cache.applyReviewResult(
        vocabId: 11,
        repetition: 1,
        intervalDays: 1,
        easeFactor: 2.6,
        dueDate: DateTime(2026, 4, 21),
        lastReviewed: DateTime(2026, 4, 20),
        lastQuality: 5,
        lapses: 0,
      );

      final card = cache.nextCard(
        level: 1,
        seenIds: const {},
        now: DateTime(2026, 4, 21),
        selector: selector,
        mode: StudyQueueMode.all,
      );

      expect(card, isNotNull);
      expect(card!.reviewState, isNotNull);
      expect(card.reviewState!.dueDate, DateTime(2026, 4, 21));
      expect(card.reviewState!.lastQuality, 5);
    });

    test('filters focused queues correctly', () {
      final cache = StudyCardCache();
      final selector = QueueSelector();

      cache.putLevelEntries(2, [
        StudyCardCacheEntry(
          vocabulary: const VocabularyItem(
            id: 20,
            level: 2,
            hanzi: '新',
            pinyin: 'xin',
            meaning: 'mới',
            example: '',
          ),
          repetition: 0,
          intervalDays: 0,
          easeFactor: 2.5,
          dueDate: null,
          lastReviewed: null,
          lastQuality: 0,
          lapses: 0,
        ),
        StudyCardCacheEntry(
          vocabulary: const VocabularyItem(
            id: 21,
            level: 2,
            hanzi: '知道',
            pinyin: 'zhidao',
            meaning: 'biet',
            example: '',
          ),
          repetition: 0,
          intervalDays: 0,
          easeFactor: 2.5,
          dueDate: DateTime(2026, 4, 20),
          lastReviewed: DateTime(2026, 4, 20),
          lastQuality: 1,
          lapses: 2,
        ),
        StudyCardCacheEntry(
          vocabulary: const VocabularyItem(
            id: 22,
            level: 2,
            hanzi: '可能',
            pinyin: 'keneng',
            meaning: 'co the',
            example: '',
          ),
          repetition: 1,
          intervalDays: 1,
          easeFactor: 2.4,
          dueDate: DateTime(2026, 4, 20),
          lastReviewed: DateTime(2026, 4, 20),
          lastQuality: 3,
          lapses: 0,
        ),
        StudyCardCacheEntry(
          vocabulary: const VocabularyItem(
            id: 23,
            level: 2,
            hanzi: '会',
            pinyin: 'hui',
            meaning: 'biết',
            example: '',
          ),
          repetition: 2,
          intervalDays: 6,
          easeFactor: 2.6,
          dueDate: DateTime(2026, 4, 28),
          lastReviewed: DateTime(2026, 4, 20),
          lastQuality: 5,
          lapses: 0,
        ),
      ]);

      final newWordCard = cache.nextCard(
        level: 2,
        seenIds: const {},
        now: DateTime(2026, 4, 20),
        selector: selector,
        mode: StudyQueueMode.newWords,
      );
      final notLearnedCard = cache.nextCard(
        level: 2,
        seenIds: const {},
        now: DateTime(2026, 4, 20),
        selector: selector,
        mode: StudyQueueMode.notLearned,
      );
      final notSureCard = cache.nextCard(
        level: 2,
        seenIds: const {},
        now: DateTime(2026, 4, 20),
        selector: selector,
        mode: StudyQueueMode.notSure,
      );
      final knownCard = cache.nextCard(
        level: 2,
        seenIds: const {},
        now: DateTime(2026, 4, 20),
        selector: selector,
        mode: StudyQueueMode.known,
      );

      expect(newWordCard?.vocabulary.id, 20);
      expect(notLearnedCard?.vocabulary.id, 21);
      expect(notSureCard?.vocabulary.id, 22);
      expect(knownCard?.vocabulary.id, 23);
      expect(
        cache.cardsForMode(level: 2, mode: StudyQueueMode.known),
        hasLength(1),
      );
    });
  });
}
