import type { Sm2Result, Sm2State } from "./types";

// Port of lib/services/sm2_scheduler.dart + reviewCard logic from study_repository.dart.
// quality: 5=known, 3=unknown, 1=hard (matching Flutter's _mapAnswerToQuality)

export function sm2(
  quality: 0 | 1 | 2 | 3 | 4 | 5,
  state: Sm2State,
  now: Date = new Date()
): Sm2Result {
  const q = Math.max(0, Math.min(5, quality));
  let { repetition, interval_days, ease_factor, lapses } = state;

  const isHardFailure = quality === 1;
  const wasKnown = state.repetition >= 2;
  const nextLapses = isHardFailure ? lapses + 1 : quality === 5 ? 0 : lapses;
  const effectiveQuality = isHardFailure && wasKnown ? 0 : q;

  const lapsePenalty = Math.min(0.12 * nextLapses, 0.8);
  const adjustedEase =
    isHardFailure && wasKnown
      ? Math.max(1.3, Math.min(2.5, ease_factor - 0.25 - lapsePenalty))
      : ease_factor;

  // SM-2 core
  let newRepetition = repetition;
  let newInterval = interval_days;

  if (effectiveQuality < 3) {
    newRepetition = 0;
    newInterval = 1;
  } else {
    newRepetition += 1;
    if (newRepetition === 1) {
      newInterval = 1;
    } else if (newRepetition === 2) {
      newInterval = 6;
    } else {
      newInterval = Math.max(1, Math.min(3650, Math.round(interval_days * adjustedEase)));
    }
  }

  let newEase =
    adjustedEase + 0.1 - (5 - effectiveQuality) * (0.08 + (5 - effectiveQuality) * 0.02);
  newEase = Math.max(1.3, Math.min(2.5, newEase));

  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const dueDate = new Date(today);
  dueDate.setDate(dueDate.getDate() + newInterval);

  return {
    repetition: newRepetition,
    interval_days: newInterval,
    ease_factor: newEase,
    lapses: nextLapses,
    due_date: dueDate.toISOString(),
    last_reviewed: now.toISOString(),
    last_quality: effectiveQuality,
  };
}

export function qualityFromAnswer(answer: "known" | "unknown" | "hard"): 0 | 1 | 2 | 3 | 4 | 5 {
  if (answer === "known") return 5;
  if (answer === "unknown") return 3;
  return 1;
}

export function isCardDue(dueDate: string | null, now: Date = new Date()): boolean {
  if (!dueDate) return true;
  return new Date(dueDate) <= now;
}

export function statusFromReview(review: { last_quality: number; repetition: number } | null): "new" | "known" | "unknown" | "hard" {
  if (!review) return "new";
  if (review.last_quality >= 4) return "known";
  if (review.last_quality === 3) return "unknown";
  return "hard";
}
