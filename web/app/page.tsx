"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { LangProvider } from "@/lib/i18n";
import { supabase } from "@/lib/supabase";
import type { Vocabulary, ReviewState, Sm2Result, StudySession } from "@/lib/types";
import { Sidebar } from "@/components/Sidebar";
import { Dashboard } from "@/components/Dashboard";
import { StudyList, ModePicker } from "@/components/StudyList";
import { FlashcardView } from "@/components/FlashcardView";
import { StatsPage } from "@/components/StatsPage";
import { SettingsPage } from "@/components/SettingsPage";
import { enrichVocabulary } from "@/lib/vocab-enrichment";
import bundledVocabularyRaw from "@/scripts/hanzii-vocab.json";

type View = "dashboard" | "study" | "flash" | "stats" | "settings";
type StudyMode = "all" | "new" | "learned" | "unsure" | "weak" | "shuffle";
type BundledVocabulary = Omit<Vocabulary, "id">;

const bundledVocabsByLevel = (bundledVocabularyRaw as BundledVocabulary[]).reduce<
  Record<number, Vocabulary[]>
>((byLevel, vocab, index) => {
  const levelVocabs = byLevel[vocab.level] ?? [];
  levelVocabs.push(enrichVocabulary({ ...vocab, id: index + 1 }));
  byLevel[vocab.level] = levelVocabs;
  return byLevel;
}, {});

function mergeBundledVocabulary(dbVocabs: Vocabulary[]): Record<number, Vocabulary[]> {
  const dbByLevel: Record<number, Vocabulary[]> = {};
  for (const vocab of dbVocabs) {
    if (!dbByLevel[vocab.level]) dbByLevel[vocab.level] = [];
    dbByLevel[vocab.level].push(enrichVocabulary(vocab));
  }

  const merged: Record<number, Vocabulary[]> = {};
  for (const lv of [1, 2, 3, 4, 5, 6]) {
    const bundled = bundledVocabsByLevel[lv] ?? [];
    const db = dbByLevel[lv] ?? [];
    const dbByHanzi = new Map(db.map(vocab => [vocab.hanzi, vocab]));
    const used = new Set<string>();
    merged[lv] = bundled.map(vocab => {
      const dbVocab = dbByHanzi.get(vocab.hanzi);
      if (dbVocab) {
        used.add(vocab.hanzi);
        return dbVocab;
      }
      return vocab;
    });
    for (const vocab of db) {
      if (!used.has(vocab.hanzi)) merged[lv].push(vocab);
    }
  }
  return merged;
}

function getStatus(review: ReviewState | null | undefined): 0 | 1 | 2 | 3 {
  if (!review || review.last_quality == null) return 0;
  if (review.last_quality >= 4) return 1;
  if (review.last_quality === 3) return 2;
  return 3;
}

function AppShell() {
  const [view, setView] = useState<View>("dashboard");
  const [level, setLevel] = useState(1);
  const [pickingLevel, setPickingLevel] = useState<number | null>(null);
  const [dashboardLevel, setDashboardLevel] = useState<number | null>(1);
  const [dailyGoal, setDailyGoal] = useState(() => {
    if (typeof window === "undefined") return 20;
    const goal = Number(localStorage.getItem("xh-daily-goal"));
    return Number.isFinite(goal) && goal > 0 ? goal : 20;
  });
  const [sessionDeck, setSessionDeck] = useState<Vocabulary[]>([]);

  const [vocabsByLevel, setVocabsByLevel] = useState<Record<number, Vocabulary[]>>({});
  const [reviewStates, setReviewStates] = useState<Record<number, ReviewState>>({});
  const [loading, setLoading] = useState(true);

  const [studySessions, setStudySessions] = useState<StudySession[]>([]);

  const [starred, setStarred] = useState<Record<string, boolean>>(() => {
    if (typeof window === "undefined") return {};
    try {
      const saved = localStorage.getItem("xh-starred");
      return saved ? JSON.parse(saved) as Record<string, boolean> : {};
    } catch {
      return {};
    }
  });
  const [notes, setNotes] = useState<Record<string, string>>(() => {
    if (typeof window === "undefined") return {};
    try {
      const saved = localStorage.getItem("xh-notes");
      return saved ? JSON.parse(saved) as Record<string, string> : {};
    } catch {
      return {};
    }
  });
  const [statusOverrides, setStatusOverrides] = useState<Record<string, 0 | 1 | 2 | 3>>({});

  // Load vocab + review states from Supabase
  useEffect(() => {
    let cancelled = false;
    async function load() {
      const [vocabRes, reviewRes, sessionsRes] = await Promise.all([
        supabase.from("vocabularies").select("*").order("id"),
        supabase.from("review_states").select("*"),
        supabase.from("study_sessions").select("*").order("study_date"),
      ]);
      if (cancelled) return;
      setVocabsByLevel(mergeBundledVocabulary((vocabRes.data ?? []) as Vocabulary[]));
      if (reviewRes.data) {
        const byId: Record<number, ReviewState> = {};
        for (const r of reviewRes.data as ReviewState[]) {
          byId[r.vocab_id] = r;
        }
        setReviewStates(byId);
      }
      if (sessionsRes.data) {
        setStudySessions(sessionsRes.data as StudySession[]);
      }
      setLoading(false);
    }
    load();
    return () => { cancelled = true; };
  }, []);

  // Restore theme from localStorage
  useEffect(() => {
    const savedTheme = localStorage.getItem("xh-theme") || "pink";
    document.body.setAttribute("data-theme", savedTheme);
  }, []);

  // Base statuses from Supabase review states
  const baseStatuses = useMemo<Record<string, 0 | 1 | 2 | 3>>(() => {
    const map: Record<string, 0 | 1 | 2 | 3> = {};
    for (const vocabs of Object.values(vocabsByLevel)) {
      for (const v of vocabs) {
        map[v.hanzi] = getStatus(reviewStates[v.id]);
      }
    }
    return map;
  }, [vocabsByLevel, reviewStates]);

  // Merge with in-session overrides
  const mergedStatuses = useMemo<Record<string, 0 | 1 | 2 | 3>>(
    () => ({ ...baseStatuses, ...statusOverrides }),
    [baseStatuses, statusOverrides]
  );

  const handleUpdateStatus = useCallback((hanzi: string, status: 0 | 1 | 2 | 3, vocabId?: number, review?: Sm2Result) => {
    setStatusOverrides(prev => ({ ...prev, [hanzi]: status }));
    if (vocabId != null && review) {
      setReviewStates(prev => ({
        ...prev,
        [vocabId]: {
          vocab_id: vocabId,
          ...review,
          updated_at: prev[vocabId]?.updated_at ?? null,
        },
      }));
    }
  }, []);

  const toggleStar = useCallback((hanzi: string) => {
    setStarred(prev => {
      const next = { ...prev };
      if (next[hanzi]) delete next[hanzi]; else next[hanzi] = true;
      try { localStorage.setItem("xh-starred", JSON.stringify(next)); } catch { /* ignore */ }
      return next;
    });
  }, []);

  const saveNote = useCallback((hanzi: string, text: string) => {
    setNotes(prev => {
      const next = { ...prev };
      if (!text.trim()) delete next[hanzi]; else next[hanzi] = text.trim();
      try { localStorage.setItem("xh-notes", JSON.stringify(next)); } catch { /* ignore */ }
      return next;
    });
  }, []);

  // Dashboard stats (for HSK 1 donut)
  const dashStats = useMemo(() => {
    const vocabs = dashboardLevel == null
      ? Object.values(vocabsByLevel).flat()
      : (vocabsByLevel[dashboardLevel] || []);
    let learned = 0, unsure = 0, weak = 0, newWords = 0;
    for (const v of vocabs) {
      const s = mergedStatuses[v.hanzi] ?? 0;
      if (s === 1) learned++;
      else if (s === 2) unsure++;
      else if (s === 3) weak++;
      else newWords++;
    }
    const deckSize = vocabs.length;
    return { learned, unsure, weak, newWords, deckSize };
  }, [dashboardLevel, vocabsByLevel, mergedStatuses]);

  // Level progress for StudyList
  const levelProgress = useMemo(() => {
    const p: Record<number, { learned: number; unsure: number; weak: number }> = {};
    for (const [lv, vocabs] of Object.entries(vocabsByLevel)) {
      let learned = 0, unsure = 0, weak = 0;
      for (const v of vocabs) {
        const s = mergedStatuses[v.hanzi] ?? 0;
        if (s === 1) learned++;
        else if (s === 2) unsure++;
        else if (s === 3) weak++;
      }
      p[Number(lv)] = { learned, unsure, weak };
    }
    return p;
  }, [vocabsByLevel, mergedStatuses]);

  // Counts for ModePicker
  const modeCounts = useMemo(() => {
    if (pickingLevel == null) return { green: 0, yellow: 0, red: 0, purple: 0 };
    const vocabs = vocabsByLevel[pickingLevel] || [];
    let g = 0, y = 0, r = 0, p = 0;
    for (const v of vocabs) {
      const s = mergedStatuses[v.hanzi] ?? 0;
      if (s === 1) g++;
      else if (s === 2) y++;
      else if (s === 3) r++;
      else p++;
    }
    return { green: g, yellow: y, red: r, purple: p };
  }, [pickingLevel, vocabsByLevel, mergedStatuses]);

  const buildSessionDeck = useCallback((lv: number, m: StudyMode) => {
    const words = vocabsByLevel[lv] || [];
    if (m === "all") return words;
    if (m === "shuffle") return [...words].sort(() => Math.random() - 0.5);
    if (m === "new") return words.filter(w => (mergedStatuses[w.hanzi] ?? 0) === 0);
    if (m === "learned") return words.filter(w => mergedStatuses[w.hanzi] === 1);
    if (m === "unsure") return words.filter(w => mergedStatuses[w.hanzi] === 2);
    if (m === "weak") return words.filter(w => mergedStatuses[w.hanzi] === 3);
    return words;
  }, [vocabsByLevel, mergedStatuses]);

  // Level stats for StatsPage
  const levelStats = useMemo(() =>
    [1, 2, 3, 4, 5, 6].map(lvNum => {
      const vocabs = vocabsByLevel[lvNum] || [];
      const total = vocabs.length;
      let learned = 0, unsure = 0, weak = 0;
      for (const v of vocabs) {
        const s = mergedStatuses[v.hanzi] ?? 0;
        if (s === 1) learned++;
        else if (s === 2) unsure++;
        else if (s === 3) weak++;
      }
      return { level: lvNum, total, learned, unsure, weak };
    }),
    [vocabsByLevel, mergedStatuses]
  );

  const totalLearned = levelStats.reduce((acc, l) => acc + l.learned, 0);

  // Vocab for Dashboard word-of-day + recent
  const allVocab = useMemo(() =>
    Object.values(vocabsByLevel).flat(),
    [vocabsByLevel]
  );
  const levelTotals = useMemo(() => {
    const totals: Record<number, number> = {};
    for (const lv of [1, 2, 3, 4, 5, 6]) {
      totals[lv] = (vocabsByLevel[lv] || []).length;
    }
    return totals;
  }, [vocabsByLevel]);

  const startSession = useCallback((lv: number, pickedMode: StudyMode) => {
    const words = vocabsByLevel[lv] || [];
    if (words.length === 0) return; // DB empty — keep modal open, ModePicker shows warning
    const deck = buildSessionDeck(lv, pickedMode);
    if (deck.length === 0) return;
    setLevel(lv);
    setSessionDeck(deck);
    setPickingLevel(null);
    setView("flash");
  }, [buildSessionDeck, vocabsByLevel]);

  const handleStartSession = useCallback((m: string) => {
    if (pickingLevel == null) return;
    startSession(pickingLevel, m as StudyMode);
  }, [pickingLevel, startSession]);

  const openDashboardBucket = useCallback((bucket: string) => {
    const targetLevel = dashboardLevel ?? 1;
    if (bucket === "learned") startSession(targetLevel, "learned");
    else if (bucket === "unsure") startSession(targetLevel, "unsure");
    else if (bucket === "weak") startSession(targetLevel, "weak");
    else if (bucket === "new") startSession(targetLevel, "new");
  }, [dashboardLevel, startSession]);

  const handleDailyGoalChange = useCallback((goal: number) => {
    setDailyGoal(goal);
    try { localStorage.setItem("xh-daily-goal", String(goal)); } catch { /* ignore */ }
  }, []);

  const handleFlashExit = useCallback(() => {
    setView("study");
    setSessionDeck([]);
    // Refetch sessions so Dashboard/Stats show updated data
    supabase.from("study_sessions").select("*").order("study_date")
      .then(({ data }) => { if (data) setStudySessions(data as StudySession[]); });
  }, []);

  if (loading) {
    return (
      <div style={{
        height: "100vh", display: "grid", placeItems: "center",
        background: "var(--bg)", color: "var(--ink-soft)", fontSize: 14,
      }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontFamily: "var(--font-hanzi)", fontSize: 40, marginBottom: 12 }}>汉</div>
          <div>Đang tải dữ liệu...</div>
        </div>
      </div>
    );
  }

  // FlashcardView is full-screen (no sidebar)
  if (view === "flash" && sessionDeck.length > 0) {
    return (
      <FlashcardView
        level={level}
        words={sessionDeck}
        statuses={mergedStatuses}
        reviewStates={reviewStates}
        onUpdateStatus={handleUpdateStatus}
        onExit={handleFlashExit}
        starred={starred}
        notes={notes}
        onToggleStar={toggleStar}
        onSaveNote={saveNote}
      />
    );
  }

  return (
    <div className="app">
      <Sidebar view={view} onNav={setView} />
      <main className="main">
        {view === "dashboard" && (
          <Dashboard
            stats={dashStats}
            statuses={mergedStatuses}
            reviewStates={reviewStates}
            recentVocab={allVocab}
            studySessions={studySessions}
            selectedLevel={dashboardLevel}
            levelTotals={levelTotals}
            dailyGoal={dailyGoal}
            onLevelChange={setDashboardLevel}
            onPickBucket={openDashboardBucket}
            onContinue={() => { setPickingLevel(dashboardLevel ?? 1); }}
            onOpenWord={(word) => {
              startSession(word.level, "all");
            }}
          />
        )}
        {view === "study" && (
          <StudyList
            progress={levelProgress}
            levelTotals={levelTotals}
            onPickDeck={lv => setPickingLevel(lv)}
          />
        )}
        {view === "stats" && <StatsPage levelStats={levelStats} totalLearned={totalLearned} studySessions={studySessions} />}
        {view === "settings" && (
          <SettingsPage
            dailyGoal={dailyGoal}
            onDailyGoalChange={handleDailyGoalChange}
          />
        )}
      </main>

      {pickingLevel != null && (
        <ModePicker
          level={pickingLevel}
          counts={modeCounts}
          dbEmpty={(vocabsByLevel[pickingLevel] || []).length === 0}
          onChoose={handleStartSession}
          onClose={() => setPickingLevel(null)}
        />
      )}
    </div>
  );
}

export default function Page() {
  return (
    <LangProvider>
      <AppShell />
    </LangProvider>
  );
}
