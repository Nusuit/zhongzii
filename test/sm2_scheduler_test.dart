import 'package:flutter_test/flutter_test.dart';
import 'package:zhongzii_flashcards/services/sm2_scheduler.dart';

void main() {
  group('Sm2Scheduler', () {
    final scheduler = Sm2Scheduler();

    test('first correct review schedules next day', () {
      final result = scheduler.schedule(
        Sm2Input(
          quality: 5,
          currentRepetition: 0,
          currentIntervalDays: 0,
          currentEaseFactor: 2.5,
          now: DateTime(2026, 4, 20, 10),
        ),
      );

      expect(result.repetition, 1);
      expect(result.intervalDays, 1);
      expect(result.dueDate, DateTime(2026, 4, 21));
    });

    test('second correct review schedules 6 days', () {
      final result = scheduler.schedule(
        Sm2Input(
          quality: 5,
          currentRepetition: 1,
          currentIntervalDays: 1,
          currentEaseFactor: 2.5,
          now: DateTime(2026, 4, 20, 10),
        ),
      );

      expect(result.repetition, 2);
      expect(result.intervalDays, 6);
      expect(result.dueDate, DateTime(2026, 4, 26));
    });

    test('hard answer resets repetition and schedules for tomorrow', () {
      final result = scheduler.schedule(
        Sm2Input(
          quality: 1,
          currentRepetition: 4,
          currentIntervalDays: 20,
          currentEaseFactor: 2.6,
          now: DateTime(2026, 4, 20, 10),
        ),
      );

      expect(result.repetition, 0);
      expect(result.intervalDays, 1);
      expect(result.dueDate, DateTime(2026, 4, 21));
      expect(result.easeFactor, greaterThanOrEqualTo(1.3));
    });
  });
}
