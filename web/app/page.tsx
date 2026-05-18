"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { LangProvider } from "@/lib/i18n";
import { supabase } from "@/lib/supabase";
import type { Vocabulary, ReviewState } from "@/lib/types";
import { Sidebar } from "@/components/Sidebar";
import { Dashboard } from "@/components/Dashboard";
import { StudyList, ModePicker, HSK_TOTALS } from "@/components/StudyList";
import { FlashcardView } from "@/components/FlashcardView";
import { StatsPage } from "@/components/StatsPage";
import { SettingsPage } from "@/components/SettingsPage";

type View = "dashboard" | "study" | "flash" | "stats" | "settings";
type StudyMode = "all" | "new" | "learned" | "unsure" | "weak" | "shuffle";

function getStatus(review: ReviewState | null | undefined): 0 | 1 | 2 | 3 {
  if (!review || review.last_quality == null) return 0;
  if (review.last_quality >= 4) return 1;
  if (review.last_quality === 3) return 2;
  return 3;
}

function AppShell() {
  const [view, setView] = useState<View>("dashboard");
  const [level, setLevel] = useState(1);
  const [mode, setMode] = useState<StudyMode | null>(null);
  const [pickingLevel, setPickingLevel] = useState<number | null>(null);

  const [vocabsByLevel, setVocabsByLevel] = useState<Record<number, Vocabulary[]>>({});
  const [reviewStates, setReviewStates] = useState<Record<number, ReviewState>>({});
  const [loading, setLoading] = useState(true);

  const [starred, setStarred] = useState<Record<string, boolean>>({});
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [statusOverrides, setStatusOverrides] = useState<Record<string, 0 | 1 | 2 | 3>>({});

  // Load vocab + review states from Supabase
  useEffect(() => {
    let cancelled = false;
    async function load() {
      const [vocabRes, reviewRes] = await Promise.all([
        supabase.from("vocabularies").select("*").order("id"),
        supabase.from("review_states").select("*"),
      ]);
      if (cancelled) return;
      if (vocabRes.data) {
        const byLevel: Record<number, Vocabulary[]> = {};
        for (const v of vocabRes.data as Vocabulary[]) {
          if (!byLevel[v.level]) byLevel[v.level] = [];
          byLevel[v.level].push(v);
        }
        setVocabsByLevel(byLevel);
      }
      if (reviewRes.data) {
        const byId: Record<number, ReviewState> = {};
        for (const r of reviewRes.data as ReviewState[]) {
          byId[r.vocab_id] = r;
        }
        setReviewStates(byId);
      }
      setLoading(false);
    }
    load();
    return () => { cancelled = true; };
  }, []);

  // Restore starred/notes/theme from localStorage
  useEffect(() => {
    try {
      const s = localStorage.getItem("xh-starred");
      if (s) setStarred(JSON.parse(s));
      const n = localStorage.getItem("xh-notes");
      if (n) setNotes(JSON.parse(n));
    } catch { /* ignore */ }
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

  const handleUpdateStatus = useCallback((hanzi: string, status: 0 | 1 | 2 | 3) => {
    setStatusOverrides(prev => ({ ...prev, [hanzi]: status }));
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
    const vocabs = vocabsByLevel[1] || [];
    let learned = 0, unsure = 0, weak = 0, newWords = 0;
    for (const v of vocabs) {
      const s = mergedStatuses[v.hanzi] ?? 0;
      if (s === 1) learned++;
      else if (s === 2) unsure++;
      else if (s === 3) weak++;
      else newWords++;
    }
    const deckSize = HSK_TOTALS[1];
    newWords += Math.max(0, deckSize - vocabs.length);
    return { learned, unsure, weak, newWords, deckSize };
  }, [vocabsByLevel, mergedStatuses]);

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
    p += Math.max(0, (HSK_TOTALS[pickingLevel] || 0) - vocabs.length);
    return { green: g, yellow: y, red: r, purple: p };
  }, [pickingLevel, vocabsByLevel, mergedStatuses]);

  // Session words
  const sessionWords = useMemo(() => {
    if (!mode || !level) return [];
    const words = vocabsByLevel[level] || [];
    if (mode === "all") return words;
    if (mode === "shuffle") return [...words].sort(() => Math.random() - 0.5);
    if (mode === "new") return words.filter(w => (mergedStatuses[w.hanzi] ?? 0) === 0);
    if (mode === "learned") return words.filter(w => mergedStatuses[w.hanzi] === 1);
    if (mode === "unsure") return words.filter(w => mergedStatuses[w.hanzi] === 2);
    if (mode === "weak") return words.filter(w => mergedStatuses[w.hanzi] === 3);
    return words;
  }, [mode, level, vocabsByLevel, mergedStatuses]);

  // Level stats for StatsPage
  const levelStats = useMemo(() =>
    Object.entries(HSK_TOTALS).map(([lv, total]) => {
      const lvNum = Number(lv);
      const vocabs = vocabsByLevel[lvNum] || [];
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
    (vocabsByLevel[1] || []).concat(vocabsByLevel[2] || []),
    [vocabsByLevel]
  );

  const handleStartSession = useCallback((m: string) => {
    if (pickingLevel == null) return;
    setLevel(pickingLevel);
    setMode(m as StudyMode);
    setPickingLevel(null);
    setView("flash");
  }, [pickingLevel]);

  // Fall back to study list if flash view has no words (empty Supabase table)
  useEffect(() => {
    if (view === "flash" && !loading && sessionWords.length === 0) {
      setView("study");
      setMode(null);
    }
  }, [view, loading, sessionWords.length]);

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
  if (view === "flash" && sessionWords.length > 0) {
    return (
      <FlashcardView
        level={level}
        words={sessionWords}
        statuses={mergedStatuses}
        reviewStates={reviewStates}
        onUpdateStatus={handleUpdateStatus}
        onExit={() => { setView("study"); setMode(null); }}
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
            recentVocab={allVocab}
            onPickBucket={() => { setPickingLevel(1); }}
            onContinue={() => { setPickingLevel(1); }}
            onOpenWord={() => { setPickingLevel(1); }}
          />
        )}
        {view === "study" && (
          <StudyList
            progress={levelProgress}
            onPickDeck={lv => setPickingLevel(lv)}
          />
        )}
        {view === "stats" && <StatsPage levelStats={levelStats} totalLearned={totalLearned} />}
        {view === "settings" && <SettingsPage />}
      </main>

      {pickingLevel != null && (
        <ModePicker
          level={pickingLevel}
          counts={modeCounts}
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
