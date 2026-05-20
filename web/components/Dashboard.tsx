"use client";

import { useMemo } from "react";
import { Icon } from "@/lib/icons";
import { useLang } from "@/lib/i18n";
import type { Vocabulary, StudySession, ReviewState } from "@/lib/types";
import { computeStreak, computeWeekly } from "@/lib/stats";

interface DashboardStats {
  learned: number;
  unsure: number;
  weak: number;
  newWords: number;
  deckSize: number;
}

interface DashboardProps {
  stats: DashboardStats;
  statuses: Record<string, 0 | 1 | 2 | 3>;
  reviewStates: Record<number, ReviewState>;
  recentVocab: Vocabulary[];
  studySessions: StudySession[];
  selectedLevel: number | null;
  levelTotals: Record<number, number>;
  dailyGoal: number;
  onLevelChange: (level: number | null) => void;
  onPickBucket: (bucket: string) => void;
  onContinue: () => void;
  onOpenWord: (word: Vocabulary) => void;
}

function Donut({ segments, size = 200, thickness = 18 }: {
  segments: { value: number; color: string }[];
  size?: number;
  thickness?: number;
}) {
  const r = size / 2 - thickness / 2;
  const c = 2 * Math.PI * r;
  const total = segments.reduce((s, x) => s + x.value, 0) || 1;
  const arcs = segments.reduce<{ value: number; color: string; offset: number; len: number }[]>(
    (items, seg) => {
      const offset = items.reduce((sum, item) => sum + item.len, 0);
      const len = (seg.value / total) * c;
      return [...items, { ...seg, offset, len }];
    },
    [],
  );
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="donut-svg">
      <circle cx={size / 2} cy={size / 2} r={r} stroke="var(--pink-pale)" strokeWidth={thickness} fill="none" />
      {arcs.map((seg, i) => (
          <circle key={i}
            cx={size / 2} cy={size / 2} r={r}
            stroke={seg.color} strokeWidth={thickness} fill="none"
            strokeDasharray={`${seg.len} ${c - seg.len}`}
            strokeDashoffset={-seg.offset}
            strokeLinecap="round"
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
          />
      ))}
    </svg>
  );
}

function timeGreeting(t: (k: string) => string) {
  const h = new Date().getHours();
  if (h < 11) return t("greet_morning");
  if (h < 13) return t("greet_noon");
  if (h < 18) return t("greet_afternoon");
  return t("greet_evening");
}

export function Dashboard({
  stats,
  statuses,
  reviewStates,
  recentVocab,
  studySessions,
  selectedLevel,
  levelTotals,
  dailyGoal,
  onLevelChange,
  onPickBucket,
  onContinue,
  onOpenWord,
}: DashboardProps) {
  const { t, lang } = useLang();
  const labeledTotal = stats.learned + stats.unsure + stats.weak;
  const deckTotal = stats.deckSize || (selectedLevel == null
    ? Object.values(levelTotals).reduce((sum, count) => sum + count, 0)
    : levelTotals[selectedLevel] || 0);

  const segments = [
    { value: stats.learned, color: "var(--green)" },
    { value: stats.unsure, color: "var(--yellow)" },
    { value: stats.weak, color: "var(--red)" },
    { value: stats.newWords, color: "var(--purple)" },
  ];
  const greeting = timeGreeting(t);
  const dateLocale = lang === "en" ? "en-US" : lang === "zh" ? "zh-CN" : "vi-VN";

  const wordOfDay = useMemo(() => {
    if (!recentVocab.length) return null;
    const d = new Date();
    const seed = d.getFullYear() * 1000 + d.getMonth() * 50 + d.getDate();
    return recentVocab[seed % recentVocab.length];
  }, [recentVocab]);

  const recent = useMemo(() => {
    return recentVocab
      .map(w => ({
        w,
        s: statuses[w.hanzi] ?? 0 as 0 | 1 | 2 | 3,
        lastReviewed: reviewStates[w.id]?.last_reviewed ?? "",
      }))
      .filter(x => x.s > 0)
      .sort((a, b) => b.lastReviewed.localeCompare(a.lastReviewed))
      .slice(0, 10);
  }, [recentVocab, reviewStates, statuses]);

  const streak = useMemo(() => computeStreak(studySessions), [studySessions]);
  const history = useMemo(() => computeWeekly(studySessions), [studySessions]);
  const histMax = useMemo(() => Math.max(1, ...history.map(h => h.known + h.hard + h.unknown)), [history]);

  const todayKey = new Date().toISOString().slice(0, 10);
  const todaySession = studySessions.find(s => s.study_date.slice(0, 10) === todayKey);
  const todayProgress = todaySession?.reviewed_count ?? 0;
  const goalPct = dailyGoal > 0 ? Math.min(100, Math.round((todayProgress / dailyGoal) * 100)) : 0;
  const levels = [1, 2, 3, 4, 5, 6];

  return (
    <div className="main-inner">
      <div className="page-head">
        <div>
          <h1 className="page-title">{greeting}, Hà 👋</h1>
          <p className="page-sub">{t("dash_sub")}</p>
        </div>
        <div className="dash-filter">
          <button
            className={`dash-filter-item ${selectedLevel == null ? "active" : ""}`}
            onClick={() => onLevelChange(null)}
          >
            All
          </button>
          {levels.map(level => (
            <button
              key={level}
              className={`dash-filter-item ${selectedLevel === level ? "active" : ""}`}
              onClick={() => onLevelChange(level)}
            >
              HSK {level}
            </button>
          ))}
        </div>
      </div>

      <button onClick={onContinue} style={{
        display: "flex", alignItems: "center", gap: 18,
        width: "100%", textAlign: "left",
        background: "linear-gradient(135deg, var(--pink) 0%, var(--pink-deep) 100%)",
        color: "#fff", borderRadius: 20, padding: "18px 22px",
        marginBottom: 16,
        boxShadow: "var(--shadow-card)",
        transition: "transform .12s, box-shadow .12s",
      }}
        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = "translateY(-2px)"; }}
        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = "translateY(0)"; }}
      >
        <div style={{
          width: 52, height: 52, borderRadius: 14,
          background: "rgba(255,255,255,0.2)", backdropFilter: "blur(6px)",
          display: "grid", placeItems: "center", flexShrink: 0,
        }}>
          <Icon name="arrow-right" size={22} stroke={2.2} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 10.5, opacity: 0.85, fontWeight: 500, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 3 }}>
            Tiến độ mục tiêu ngày
          </div>
          <div style={{ fontSize: 18, fontWeight: 700, letterSpacing: "-0.01em", lineHeight: 1.25, marginBottom: 3 }}>
            Hôm nay — {todayProgress} / {dailyGoal} từ đã ôn
          </div>
          <div style={{ fontSize: 12.5, opacity: 0.9 }}>
            Mục tiêu được đặt trong Cài đặt
          </div>
        </div>
        <div style={{ minWidth: 90, textAlign: "right" }}>
          <div style={{ fontSize: 30, fontWeight: 700, lineHeight: 1, letterSpacing: "-0.02em" }}>
            {goalPct}%
          </div>
          <div style={{ fontSize: 11, opacity: 0.85, marginTop: 2 }}>mục tiêu</div>
        </div>
      </button>

      <div className="dash-grid">
        <div className="card totals-card">
          <div className="donut-wrap">
            <Donut segments={segments} />
            <div className="donut-center">
              <div>
                <div className="donut-num">{labeledTotal}</div>
                <div className="donut-label">
                  trên {deckTotal} {t("vocab_unit")}
                </div>
              </div>
            </div>
          </div>
          <div className="bucket-list">
            <button className="bucket" onClick={() => onPickBucket("learned")}>
              <div className="bucket-dot green"><Icon name="check" size={18} stroke={2.4} /></div>
              <div>
                <div className="bucket-label">{t("learned")}</div>
                <div style={{ fontSize: 12, color: "var(--ink-soft)" }}>{stats.learned} {t("words_unit")}</div>
              </div>
              <span className="bucket-chev"><Icon name="chev-right" size={16} /></span>
            </button>
            <button className="bucket" onClick={() => onPickBucket("unsure")}>
              <div className="bucket-dot yellow"><Icon name="question" size={18} stroke={2.4} /></div>
              <div>
                <div className="bucket-label">{t("unsure")}</div>
                <div style={{ fontSize: 12, color: "var(--ink-soft)" }}>{stats.unsure} {t("words_unit")}</div>
              </div>
              <span className="bucket-chev"><Icon name="chev-right" size={16} /></span>
            </button>
            <button className="bucket" onClick={() => onPickBucket("weak")}>
              <div className="bucket-dot red"><Icon name="x" size={18} stroke={2.4} /></div>
              <div>
                <div className="bucket-label">{t("weak")}</div>
                <div style={{ fontSize: 12, color: "var(--ink-soft)" }}>{stats.weak} {t("words_unit")}</div>
              </div>
              <span className="bucket-chev"><Icon name="chev-right" size={16} /></span>
            </button>
            <button className="bucket" onClick={() => onPickBucket("new")}>
              <div className="bucket-dot purple"><Icon name="sparkle" size={16} stroke={2} /></div>
              <div>
                <div className="bucket-label">{t("new_label")}</div>
                <div style={{ fontSize: 12, color: "var(--ink-soft)" }}>{stats.newWords} {t("words_unit")}</div>
              </div>
              <span className="bucket-chev"><Icon name="chev-right" size={16} /></span>
            </button>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div className="card" style={{
            background: "linear-gradient(160deg, var(--elev) 0%, var(--pink-pale) 100%)",
            position: "relative", overflow: "hidden",
          }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
              <h3 className="card-title" style={{ margin: 0, display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ color: "var(--pink-deep)" }}><Icon name="sparkle" size={14} /></span>
                {t("word_of_day")}
              </h3>
              <span style={{ fontSize: 11, color: "var(--ink-mute)" }}>
                {new Date().toLocaleDateString(dateLocale, { day: "numeric", month: "long" })}
              </span>
            </div>
            {wordOfDay ? (
              <button onClick={() => onOpenWord(wordOfDay)} style={{
                display: "flex", alignItems: "center", gap: 14,
                width: "100%", textAlign: "left", background: "transparent",
              }}>
                <div style={{
                  fontFamily: "var(--font-hanzi)",
                  fontSize: 52, fontWeight: 700,
                  color: "var(--ink)", lineHeight: 1, letterSpacing: "0.04em",
                  flexShrink: 0,
                }}>
                  {wordOfDay.hanzi}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, color: "var(--pink-deep)", fontWeight: 500, marginBottom: 2 }}>
                    {wordOfDay.pinyin}
                  </div>
                  <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 6 }}>{wordOfDay.meaning}</div>
                  {wordOfDay.example && (
                    <div style={{
                      fontSize: 12, color: "var(--ink-soft)",
                      fontFamily: "var(--font-hanzi)",
                      lineHeight: 1.5,
                    }}>
                      {wordOfDay.example}
                    </div>
                  )}
                </div>
              </button>
            ) : (
              <div style={{ fontSize: 13, color: "var(--ink-soft)", padding: "12px 0" }}>—</div>
            )}
          </div>

          <div className="card">
            <h3 className="card-title">{t("streak")}</h3>
            <div className="streak-grid">
              <div className="streak-tile">
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
                  <span style={{ color: "var(--pink-deep)" }}><Icon name="flame" size={18} /></span>
                  <span className="streak-tag" style={{ marginTop: 0 }}>{t("current")}</span>
                </div>
                <div className="streak-num">{streak.current || "—"} <span style={{ fontSize: 14, fontWeight: 500, color: "var(--ink-soft)" }}>{t("days")}</span></div>
              </div>
              <div className="streak-tile">
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
                  <span style={{ color: "var(--pink-deep)" }}><Icon name="trophy" size={18} /></span>
                  <span className="streak-tag" style={{ marginTop: 0 }}>{t("record")}</span>
                </div>
                <div className="streak-num">{streak.record || "—"} <span style={{ fontSize: 14, fontWeight: 500, color: "var(--ink-soft)" }}>{t("days")}</span></div>
              </div>
              <div className="streak-tile">
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
                  <span style={{ color: "var(--pink-deep)" }}><Icon name="calendar" size={18} /></span>
                  <span className="streak-tag" style={{ marginTop: 0 }}>{t("this_week")}</span>
                </div>
                <div className="streak-num">{history.reduce((a, h) => a + h.known + h.hard + h.unknown, 0) || "—"} <span style={{ fontSize: 14, fontWeight: 500, color: "var(--ink-soft)" }}>{t("words_unit")}</span></div>
              </div>
              <div className="streak-tile">
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
                  <span style={{ color: "var(--pink-deep)" }}><Icon name="sparkle" size={16} /></span>
                  <span className="streak-tag" style={{ marginTop: 0 }}>{t("average")}</span>
                </div>
                <div className="streak-num">{streak.avgPerDay || "—"} <span style={{ fontSize: 14, fontWeight: 500, color: "var(--ink-soft)" }}>{t("words_per_day")}</span></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1.4fr", gap: 16, marginTop: 16 }}>
        <div className="card">
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
            <h3 className="card-title" style={{ margin: 0 }}>{t("recent")}</h3>
            <span style={{ fontSize: 11.5, color: "var(--ink-mute)" }}>{recent.length} {t("words_unit")}</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {recent.length === 0 && (
              <div style={{ fontSize: 13, color: "var(--ink-soft)", padding: "20px 0", textAlign: "center" }}>
                {t("no_recent")}
              </div>
            )}
            {recent.map(({ w, s }) => {
              const color = s === 1 ? "green" : s === 2 ? "yellow" : "red";
              return (
                <button key={w.hanzi} onClick={() => onOpenWord(w)} style={{
                  display: "flex", alignItems: "center", gap: 12,
                  padding: "8px 10px", borderRadius: 10,
                  width: "100%", textAlign: "left",
                  transition: "background .1s",
                }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "var(--surface-2)"; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
                >
                  <div style={{ fontFamily: "var(--font-hanzi)", fontSize: 22, fontWeight: 600, minWidth: 30 }}>
                    {w.hanzi}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, color: "var(--pink-deep)" }}>{w.pinyin}</div>
                    <div style={{ fontSize: 12.5, color: "var(--ink-soft)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {w.meaning}
                    </div>
                  </div>
                  <span className={`status-dot ${color}`}></span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="card">
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <h3 className="card-title" style={{ margin: 0 }}>{t("history")}</h3>
            <div style={{
              padding: "6px 14px", borderRadius: 999,
              background: "var(--pink-pale)", color: "var(--pink-deep)",
              fontSize: 12, fontWeight: 600,
            }}>{t("range_7")}</div>
          </div>

          <div className="history-chart history-chart-card" style={{ "--cols": 7 } as React.CSSProperties & { "--cols": number }}>
            {history.map((h, i) => (
              <div className="hist-col" key={i}>
                <div className="hist-stack">
                  <div className="hist-seg green" style={{ height: `${(h.known / histMax) * 100}%` }}></div>
                  <div className="hist-seg yellow" style={{ height: `${(h.hard / histMax) * 100}%` }}></div>
                  <div className="hist-seg red" style={{ height: `${(h.unknown / histMax) * 100}%` }}></div>
                </div>
                <div className="hist-label">{h.day}</div>
              </div>
            ))}
          </div>
          <div className="legend">
            <div className="legend-item"><span className="swatch" style={{ background: "var(--green)" }}></span>{t("learned")}</div>
            <div className="legend-item"><span className="swatch" style={{ background: "var(--yellow)" }}></span>{t("unsure")}</div>
            <div className="legend-item"><span className="swatch" style={{ background: "var(--red)" }}></span>{t("weak")}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
