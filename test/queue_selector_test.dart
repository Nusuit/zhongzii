import 'package:flutter_test/flutter_test.dart';
import 'package:zhongzii_flashcards/services/queue_selector.dart';

void main() {
  group('QueueSelector', () {
    final selector = QueueSelector();
    final now = DateTime(2026, 4, 20, 9);

    test('prioritizes due cards and excludes seen cards', () {
      final candidate = selector.nextCandidate(
        candidates: [
          QueueCandidate(vocabId: 1, dueDate: DateTime(2026, 4, 19)),
          QueueCandidate(vocabId: 2, dueDate: null),
          QueueCandidate(vocabId: 3, dueDate: DateTime(2026, 4, 18)),
        ],
        seenVocabIds: {3},
        now: now,
      );

      expect(candidate?.vocabId, 1);
    });

    test('does not return future scheduled cards', () {
      final candidate = selector.nextCandidate(
        candidates: [
          QueueCandidate(vocabId: 1, dueDate: DateTime(2026, 4, 22)),
        ],
        seenVocabIds: const {},
        now: now,
      );

      expect(candidate, isNull);
    });
  });
}
