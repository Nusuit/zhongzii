"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { Icon } from "@/lib/icons";
import { useLang } from "@/lib/i18n";
import type { Vocabulary, ReviewState } from "@/lib/types";
import { sm2, qualityFromAnswer } from "@/lib/sm2";
import { supabase } from "@/lib/supabase";

function statusColor(s: 0 | 1 | 2 | 3) {
  if (s === 1) return "green";
  if (s === 2) return "yellow";
  if (s === 3) return "red";
  return "purple";
}

interface FlashcardViewProps {
  level: number;
  words: Vocabulary[];
  statuses: Record<string, 0 | 1 | 2 | 3>;
  reviewStates: Record<number, ReviewState>;
  onUpdateStatus: (hanzi: string, status: 0 | 1 | 2 | 3) => void;
  onExit: () => void;
  starred: Record<string, boolean>;
  notes: Record<string, string>;
  onToggleStar: (hanzi: string) => void;
  onSaveNote: (hanzi: string, text: string) => void;
}

export function FlashcardView({
  level,
  words,
  statuses,
  reviewStates,
  onUpdateStatus,
  onExit,
  starred,
  notes,
  onToggleStar,
  onSaveNote,
}: FlashcardViewProps) {
  const { t } = useLang();
  const listRef = useRef<HTMLDivElement>(null);
  const activeRef = useRef<HTMLButtonElement>(null);
  const sessionCounts = useRef({ reviewed: 0, known: 0, hard: 0, unknown: 0, accessed: new Set<number>() });
  const [idx, setIdx] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [search, setSearch] = useState("");
  const [showNote, setShowNote] = useState(false);
  const [noteDraft, setNoteDraft] = useState("");
  const [pomoOn, setPomoOn] = useState(false);
  const [pomoSecs, setPomoSecs] = useState(25 * 60);

  const current = words[idx];
  const currentStatus = (statuses[current?.hanzi] ?? 0) as 0 | 1 | 2 | 3;
  const isStarred = current ? !!starred[current.hanzi] : false;
  const noteValue = current ? (notes[current.hanzi] || "") : "";

  const statusLabel = (s: 0 | 1 | 2 | 3) =>
    s === 1 ? t("learned") : s === 2 ? t("unsure") : s === 3 ? t("weak") : t("new_label");

  useEffect(() => {
    setNoteDraft(noteValue);
    setShowNote(false);
  }, [current?.hanzi, noteValue]);

  useEffect(() => {
    const container = listRef.current;
    const active = activeRef.current;
    if (!container || !active) return;
    const cRect = container.getBoundingClientRect();
    const aRect = active.getBoundingClientRect();
    const offset = aRect.top - cRect.top - (container.clientHeight / 2) + (active.clientHeight / 2);
    container.scrollTo({ top: container.scrollTop + offset, behavior: "smooth" });
  }, [idx]);

  useEffect(() => {
    if (!pomoOn) return;
    const interval = setInterval(() => {
      setPomoSecs(s => {
        if (s <= 1) {
          if (window.Notification && Notification.permission === "granted") {
            new Notification(t("pomo_done_title"), { body: t("pomo_done_body") });
          }
          setPomoOn(false);
          return 25 * 60;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [pomoOn, t]);

  const pomoFmt = `${String(Math.floor(pomoSecs / 60)).padStart(2, "0")}:${String(pomoSecs % 60).padStart(2, "0")}`;

  const onFlip = useCallback(() => setFlipped(f => !f), []);
  const goNext = useCallback(() => {
    setFlipped(false);
    setIdx(i => Math.min(i + 1, words.length - 1));
  }, [words.length]);
  const goPrev = useCallback(() => {
    setFlipped(false);
    setIdx(i => Math.max(i - 1, 0));
  }, []);

  useEffect(() => {
    sessionCounts.current.accessed.add(idx);
  }, [idx]);

  const handleExit = useCallback(async () => {
    const c = sessionCounts.current;
    if (c.reviewed > 0) {
      const today = new Date().toISOString().slice(0, 10);
      const { data } = await supabase.from("study_sessions").select("*").eq("study_date", today).maybeSingle();
      if (data) {
        await supabase.from("study_sessions").update({
          reviewed_count: data.reviewed_count + c.reviewed,
          accessed_count: data.accessed_count + c.accessed.size,
          known_count: data.known_count + c.known,
          unknown_count: data.unknown_count + c.unknown,
          hard_count: data.hard_count + c.hard,
        }).eq("study_date", today);
      } else {
        await supabase.from("study_sessions").insert({
          study_date: today,
          reviewed_count: c.reviewed,
          accessed_count: c.accessed.size,
          known_count: c.known,
          unknown_count: c.unknown,
          hard_count: c.hard,
        });
      }
    }
    onExit();
  }, [onExit]);

  const mark = useCallback(async (newStatus: 1 | 2 | 3) => {
    if (!current) return;
    sessionCounts.current.reviewed++;
    if (newStatus === 1) sessionCounts.current.known++;
    else if (newStatus === 2) sessionCounts.current.hard++;
    else sessionCounts.current.unknown++;
    onUpdateStatus(current.hanzi, newStatus);

    // status 1=learned→known, 2=unsure→hard, 3=weak→unknown
    const qualityMap: Record<1 | 2 | 3, "known" | "hard" | "unknown"> = {
      1: "known",
      2: "hard",
      3: "unknown",
    };
    const quality = qualityFromAnswer(qualityMap[newStatus]);
    const existing = reviewStates[current.id];
    const prevState = existing ? {
      repetition: existing.repetition,
      interval_days: existing.interval_days,
      ease_factor: existing.ease_factor,
      lapses: existing.lapses,
    } : { repetition: 0, interval_days: 0, ease_factor: 2.5, lapses: 0 };

    const result = sm2(quality, prevState);
    await supabase.from("review_states").upsert({
      vocab_id: current.id,
      ...result,
    });

    setTimeout(goNext, 180);
  }, [current, onUpdateStatus, reviewStates, goNext]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      if (e.code === "Space") { e.preventDefault(); onFlip(); }
      else if (e.code === "ArrowRight") { e.preventDefault(); goNext(); }
      else if (e.code === "ArrowLeft") { e.preventDefault(); goPrev(); }
      else if (e.key === "1") mark(3);
      else if (e.key === "2") mark(2);
      else if (e.key === "3") mark(1);
      else if (e.key === "s" || e.key === "S") { if (current) onToggleStar(current.hanzi); }
      else if (e.key === "n" || e.key === "N") setShowNote(v => !v);
      else if (e.key === "Escape") handleExit();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onFlip, goNext, goPrev, mark, handleExit, onToggleStar, current]);

  const speak = useCallback((text: string) => {
    if (!text || !window.speechSynthesis) return;
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "zh-CN";
    u.rate = 0.85;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(u);
  }, []);

  const scrollTop = () => listRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  const scrollBottom = () => listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });

  const filtered = useMemo(() => {
    if (!search.trim()) return words;
    const q = search.trim().toLowerCase();
    return words.filter(w =>
      w.hanzi.includes(q) ||
      (w.pinyin?.toLowerCase().includes(q) ?? false) ||
      w.meaning.toLowerCase().includes(q)
    );
  }, [words, search]);

  if (!current) return null;

  return (
    <div className="flash-screen">
      <div className="flash-main">
        <div className="flash-topbar">
          <button className="back-btn" onClick={handleExit}>
            <Icon name="arrow-left" size={16} /> {t("back")}
          </button>
          <div className={`flash-status ${statusColor(currentStatus)}`}>
            <span className="swatch"></span>
            {statusLabel(currentStatus)}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <button
              onClick={() => setPomoOn(v => !v)}
              title={pomoOn ? t("pomo_pause") : t("pomo_start")}
              style={{
                display: "inline-flex", alignItems: "center", gap: 8,
                padding: "8px 14px", borderRadius: 10,
                background: pomoOn ? "var(--pink)" : "var(--elev)",
                color: pomoOn ? "#fff" : "var(--ink-soft)",
                fontSize: 13, fontWeight: 600,
                boxShadow: "var(--shadow-soft)",
                fontVariantNumeric: "tabular-nums",
              }}>
              <span style={{
                width: 8, height: 8, borderRadius: "50%",
                background: pomoOn ? "#fff" : "var(--ink-mute)",
                animation: pomoOn ? "pulse 1.4s infinite" : "none",
              }}></span>
              {pomoFmt}
            </button>
            <div className="flash-counter">{idx + 1} / {words.length}</div>
          </div>
        </div>

        <div className="card-stage">
          <div className={`flash-card ${flipped ? "flipped" : ""}`} onClick={onFlip}>
            <div className="flash-face front">
              <div className="hanzi-big">{current.hanzi}</div>
              <div style={{ position: "absolute", top: 22, right: 22, display: "flex", gap: 8 }}>
                <button
                  onClick={e => { e.stopPropagation(); onToggleStar(current.hanzi); }}
                  title="Ghim từ này (S)"
                  style={{
                    width: 40, height: 40, borderRadius: 12,
                    background: isStarred ? "#fbe7a3" : "var(--pink-pale)",
                    color: isStarred ? "#a87810" : "var(--pink-deep)",
                    display: "grid", placeItems: "center",
                    fontSize: 18, transition: "background .12s",
                  }}>
                  {isStarred ? "★" : "☆"}
                </button>
                <button
                  onClick={e => { e.stopPropagation(); speak(current.hanzi); }}
                  style={{
                    width: 40, height: 40, borderRadius: 12,
                    background: "var(--pink-pale)", color: "var(--pink-deep)",
                    display: "grid", placeItems: "center",
                  }}
                  title="Phát âm">
                  <Icon name="speaker" size={18} />
                </button>
              </div>
              <div className="flash-hint">
                {t("flip_hint_1")} <span className="kbd">Space</span> {t("flip_hint_2")}
              </div>
            </div>

            <div className="flash-face back">
              <div style={{ position: "absolute", top: 22, right: 22, display: "flex", gap: 8 }}>
                <button
                  onClick={e => { e.stopPropagation(); onToggleStar(current.hanzi); }}
                  style={{
                    width: 40, height: 40, borderRadius: 12,
                    background: isStarred ? "#fbe7a3" : "var(--pink-pale)",
                    color: isStarred ? "#a87810" : "var(--pink-deep)",
                    display: "grid", placeItems: "center",
                    fontSize: 18,
                  }}>
                  {isStarred ? "★" : "☆"}
                </button>
                <button
                  onClick={e => { e.stopPropagation(); setShowNote(v => !v); }}
                  title="Ghi chú cá nhân (N)"
                  style={{
                    width: 40, height: 40, borderRadius: 12,
                    background: showNote ? "var(--pink)" : "var(--pink-pale)",
                    color: showNote ? "#fff" : "var(--pink-deep)",
                    display: "grid", placeItems: "center",
                    position: "relative",
                  }}>
                  <Icon name="book" size={16} />
                  {noteValue && (
                    <span style={{
                      position: "absolute", top: 4, right: 4,
                      width: 8, height: 8, borderRadius: "50%",
                      background: "var(--pink-deep)", border: "2px solid var(--surface)",
                    }}></span>
                  )}
                </button>
                <button
                  onClick={e => { e.stopPropagation(); speak(current.hanzi); }}
                  style={{
                    width: 40, height: 40, borderRadius: 12,
                    background: "var(--pink-pale)", color: "var(--pink-deep)",
                    display: "grid", placeItems: "center",
                  }}>
                  <Icon name="speaker" size={18} />
                </button>
              </div>
              <div className="flash-back-hanzi">{current.hanzi}</div>
              <div className="flash-pinyin">{current.pinyin}</div>
              <div className="flash-meaning">{current.meaning}</div>
              {current.example && (
                <div className="flash-example">
                  <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="flash-example-hanzi">{current.example}</div>
                    </div>
                    <button
                      onClick={e => { e.stopPropagation(); speak(current.example!); }}
                      style={{
                        width: 32, height: 32, borderRadius: 10,
                        background: "rgba(255,255,255,0.7)", color: "var(--pink-deep)",
                        display: "grid", placeItems: "center", flexShrink: 0,
                      }}>
                      <Icon name="speaker" size={14} />
                    </button>
                  </div>
                </div>
              )}
              <div className="flash-hint">{t("rate_hint")}</div>
            </div>
          </div>
        </div>

        {showNote && (
          <div onClick={e => e.stopPropagation()} style={{
            width: "min(640px, 90%)",
            margin: "12px auto 0",
            background: "var(--elev)", borderRadius: 16, padding: 16,
            boxShadow: "var(--shadow-card)", flexShrink: 0,
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
              <Icon name="book" size={14} stroke={2} />
              <span style={{ fontSize: 12, fontWeight: 600, color: "var(--ink-soft)" }}>
                {t("personal_note")} — {current.hanzi}
              </span>
              <button onClick={() => setShowNote(false)} style={{ marginLeft: "auto", color: "var(--ink-mute)" }}>
                <Icon name="x" size={14} />
              </button>
            </div>
            <textarea
              value={noteDraft}
              onChange={e => setNoteDraft(e.target.value)}
              onBlur={() => onSaveNote(current.hanzi, noteDraft)}
              placeholder={t("note_placeholder")}
              style={{
                width: "100%", minHeight: 60, maxHeight: 120, resize: "vertical",
                background: "var(--surface-2)", border: "none", borderRadius: 10,
                padding: 12, fontSize: 13, fontFamily: "inherit",
                color: "var(--ink)", outline: "none", boxSizing: "border-box",
              }}
            />
            <div style={{ fontSize: 11, color: "var(--ink-mute)", marginTop: 6, textAlign: "right" }}>
              {t("note_autosave")}
            </div>
          </div>
        )}

        <div className="flash-actions">
          <button className="flash-btn red" onClick={() => mark(3)} title={`${t("weak")} (1)`}>
            <div className="flash-btn-ic"><Icon name="x" size={18} stroke={2.4} /></div>
            <span>{t("weak")}</span>
            <span className="flash-btn-key">1</span>
          </button>
          <button className="flash-btn yellow" onClick={() => mark(2)} title={`${t("unsure")} (2)`}>
            <div className="flash-btn-ic"><Icon name="question" size={18} stroke={2.4} /></div>
            <span>{t("unsure")}</span>
            <span className="flash-btn-key">2</span>
          </button>
          <button className="flash-btn green" onClick={() => mark(3)} title={`${t("learned")} (3)`}>
            <div className="flash-btn-ic"><Icon name="check" size={18} stroke={2.4} /></div>
            <span>{t("learned")}</span>
            <span className="flash-btn-key">3</span>
          </button>
        </div>

        <div style={{
          display: "flex", justifyContent: "center", gap: 18, marginTop: 14,
          fontSize: 12, color: "var(--ink-mute)", flexWrap: "wrap",
        }}>
          <span><span className="kbd">←</span> {t("prev")}</span>
          <span><span className="kbd">→</span> {t("next")}</span>
          <span><span className="kbd">Space</span> {t("flip")}</span>
          <span><span className="kbd">S</span> {t("pin_short")}</span>
          <span><span className="kbd">N</span> {t("note_short")}</span>
          <span><span className="kbd">Esc</span> {t("exit")}</span>
        </div>
      </div>

      <aside className="word-panel">
        <div className="word-panel-head">
          <h3 className="word-panel-title">HSK {level} — {t("word_list")}</h3>
          <p className="word-panel-sub">{words.length} {t("in_session")}</p>
          <div className="word-search">
            <Icon name="search" size={14} />
            <input
              placeholder={t("search_placeholder")}
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
        </div>
        <div className="word-list" ref={listRef}>
          {filtered.map(w => {
            const realIdx = words.indexOf(w);
            const s = (statuses[w.hanzi] ?? 0) as 0 | 1 | 2 | 3;
            const isActive = realIdx === idx;
            return (
              <button
                key={w.hanzi}
                ref={isActive ? activeRef : null}
                className={`word-row ${isActive ? "active" : ""}`}
                onClick={() => { setIdx(realIdx); setFlipped(false); }}
              >
                <div className="word-idx">{realIdx + 1}</div>
                <div className="word-info">
                  <div className="word-info-hanzi">
                    {w.hanzi}
                    <span style={{ fontFamily: "var(--font-display)", fontSize: 12, fontWeight: 400, color: "var(--pink-deep)", marginLeft: 6 }}>
                      {w.pinyin}
                    </span>
                    {starred[w.hanzi] && (
                      <span style={{ color: "var(--yellow)", marginLeft: 4, fontSize: 12 }}>★</span>
                    )}
                  </div>
                  <div className="word-info-meta">{w.meaning}</div>
                </div>
                <span className={`status-dot ${statusColor(s)}`}></span>
              </button>
            );
          })}
          {filtered.length === 0 && (
            <div style={{ padding: 30, textAlign: "center", color: "var(--ink-mute)", fontSize: 13 }}>
              {t("no_match")}
            </div>
          )}
        </div>
        <div style={{
          display: "flex", gap: 8, padding: "10px 14px",
          borderTop: "1px solid rgba(0,0,0,0.04)",
          background: "var(--surface)",
        }}>
          <button onClick={scrollTop} title={t("scroll_top")} style={{
            flex: 1, padding: "8px 10px", borderRadius: 10,
            background: "var(--surface-2)", color: "var(--ink-soft)",
            display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6,
            fontSize: 12, fontWeight: 500,
          }}>
            <span style={{ transform: "rotate(-90deg)", display: "inline-flex" }}>
              <Icon name="chev-right" size={14} stroke={2.4} />
            </span>
            {t("scroll_top")}
          </button>
          <button onClick={scrollBottom} title={t("scroll_bottom")} style={{
            flex: 1, padding: "8px 10px", borderRadius: 10,
            background: "var(--surface-2)", color: "var(--ink-soft)",
            display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6,
            fontSize: 12, fontWeight: 500,
          }}>
            <span style={{ transform: "rotate(90deg)", display: "inline-flex" }}>
              <Icon name="chev-right" size={14} stroke={2.4} />
            </span>
            {t("scroll_bottom")}
          </button>
        </div>
      </aside>
    </div>
  );
}
