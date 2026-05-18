class Sm2Input {
  const Sm2Input({
    required this.quality,
    required this.currentRepetition,
    required this.currentIntervalDays,
    required this.currentEaseFactor,
    required this.now,
  });

  final int quality;
  final int currentRepetition;
  final int currentIntervalDays;
  final double currentEaseFactor;
  final DateTime now;
}

class Sm2Result {
  const Sm2Result({
    required this.repetition,
    required this.intervalDays,
    required this.easeFactor,
    required this.dueDate,
  });

  final int repetition;
  final int intervalDays;
  final double easeFactor;
  final DateTime dueDate;
}

class Sm2Scheduler {
  Sm2Result schedule(Sm2Input input) {
    final boundedQuality = input.quality.clamp(0, 5);
    var repetition = input.currentRepetition;
    var interval = input.currentIntervalDays;
    var ease = input.currentEaseFactor;

    if (boundedQuality < 3) {
      repetition = 0;
      interval = 1;
    } else {
      repetition += 1;
      if (repetition == 1) {
        interval = 1;
      } else if (repetition == 2) {
        interval = 6;
      } else {
        interval = (input.currentIntervalDays * ease).round().clamp(1, 3650);
      }
    }

    ease = ease + (0.1 - (5 - boundedQuality) * (0.08 + (5 - boundedQuality) * 0.02));
    if (ease < 1.3) {
      ease = 1.3;
    }

    final dueDate = DateTime(
      input.now.year,
      input.now.month,
      input.now.day,
    ).add(Duration(days: interval));

    return Sm2Result(
      repetition: repetition,
      intervalDays: interval,
      easeFactor: ease,
      dueDate: dueDate,
    );
  }
}
