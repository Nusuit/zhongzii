export interface Vocabulary {
  id: number;
  level: number;
  hanzi: string;
  pinyin: string | null;
  meaning: string;
  han_viet: string | null;
  example: string | null;
}

export interface ReviewState {
  vocab_id: number;
  repetition: number;
  interval_days: number;
  ease_factor: number;
  due_date: string | null;
  last_reviewed: string | null;
  last_quality: number;
  lapses: number;
  updated_at: string | null;
}

export interface StudySession {
  study_date: string;
  reviewed_count: number;
  accessed_count: number;
  known_count: number;
  unknown_count: number;
  hard_count: number;
}

export interface VocabWithReview extends Vocabulary {
  review: ReviewState | null;
}

export type ReviewAnswer = "known" | "unknown" | "hard";

export type StudyMode = "all" | "known" | "new" | "notLearned" | "notSure";

export interface DashboardStats {
  known: number;
  unknown: number;
  hard: number;
  newWords: number;
  totalWords: number;
}

export interface LevelStats {
  level: number;
  total: number;
  known: number;
  unknown: number;
  hard: number;
  newWords: number;
}

export interface Sm2State {
  repetition: number;
  interval_days: number;
  ease_factor: number;
  lapses: number;
}

export interface Sm2Result extends Sm2State {
  due_date: string;
  last_reviewed: string;
  last_quality: number;
}
