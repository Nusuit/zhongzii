"use client";

import { useMemo, useState } from "react";
import { Icon } from "@/lib/icons";
import { useLang } from "@/lib/i18n";

interface LevelAccuracy {
  level: number;
  total: number;
  learned: number;
  unsure: number;
  weak: number;
}

interface StatsPageProps {
  levelStats?: LevelAccuracy[];
  totalLearned?: number;
}

const HEAT_COLORS = ["#fbeef1", "#f6c8d2", "#e58aa0", "#d56a85", "#a83d57"];

export function StatsPage({ levelStats, totalLearned = 0 }: StatsPageProps) {
  const { t } = useLang();
  const [range, setRange] = useState("30");

  const heatmap = useMemo(() => {
    const arr: number[] = [];
    for (let i = 0; i < 84; i++) {
      const recency = i / 84;
      const rand = Math.random();
      let v: number;
      if (rand < 0.1) v = 0;
      else if (rand < 0.3 + recency * 0.2) v = 1;
      else if (rand < 0.6 + recency * 0.15) v = 2;
      else if (rand < 0.85) v = 3;
      else v = 4;
      arr.push(v);
    }
    return arr;
  }, []);

  const defaultStats: LevelAccuracy[] = [
    { level: 1, total: 149, learned: 0, unsure: 0, weak: 0 },
    { level: 2, total: 150, learned: 0, unsure: 0, weak: 0 },
    { level: 3, total: 295, learned: 0, unsure: 0, weak: 0 },
    { level: 4, total: 600, learned: 0, unsure: 0, weak: 0 },
    { level: 5, total: 1295, learned: 0, unsure: 0, weak: 0 },
    { level: 6, total: 2513, learned: 0, unsure: 0, weak: 0 },
  ];

  const accuracy = levelStats || defaultStats;

  const achievements = [
    { id: "first", title: "Bước đầu tiên", sub: "Học 10 từ đầu tiên", icon: "sparkle", earned: totalLearned >= 10, color: "var(--green)" },
    { id: "week", title: "Tuần lễ học tập", sub: "Học 7 ngày liên tiếp", icon: "flame", earned: false, color: "var(--pink)" },
    { id: "hundred", title: "Một trăm từ", sub: "Học thuộc 100 từ vựng", icon: "trophy", earned: totalLearned >= 100, color: "var(--yellow)" },
    { id: "hsk1", title: "Hoàn thành HSK 1", sub: "Thuộc 100% từ HSK 1", icon: "check", earned: false, color: "var(--purple)" },
    { id: "month", title: "Một tháng kiên trì", sub: "Học 30 ngày liên tiếp", icon: "calendar", earned: false, color: "var(--ink-soft)" },
    { id: "polyglot", title: "Học giả", sub: "Học thuộc 1000 từ vựng", icon: "book", earned: totalLearned >= 1000, color: "var(--ink-soft)" },
  ];

  const earnedCount = achievements.filter(a => a.earned).length;

  return (
    <div className="main-inner">
      <div className="page-head">
        <div>
          <h1 className="page-title">{t("stats_title")}</h1>
          <p className="page-sub">{t("stats_sub")}</p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button className={`range-tab ${range === "7" ? "active" : ""}`} onClick={() => setRange("7")}>{t("range_7")}</button>
          <button className={`range-tab ${range === "30" ? "active" : ""}`} onClick={() => setRange("30")}>{t("range_30")}</button>
          <button className={`range-tab ${range === "all" ? "active" : ""}`} onClick={() => setRange("all")}>{t("range_all")}</button>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 22 }}>
        {[
          { num: String(totalLearned), lbl: t("kpi_total"), ic: "check", color: "var(--green)", trend: t("this_week") },
          { num: "—", lbl: t("kpi_streak"), ic: "flame", color: "var(--pink-deep)", trend: `${t("record")}: —` },
          { num: "—", lbl: t("kpi_acc"), ic: "trophy", color: "var(--yellow)", trend: "" },
          { num: "—", lbl: t("kpi_minutes"), ic: "calendar", color: "var(--purple)", trend: t("average") },
        ].map(k => (
          <div key={k.lbl} className="card" style={{ padding: "20px 22px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
              <div style={{
                width: 32, height: 32, borderRadius: 10,
                background: "var(--surface-2)", color: k.color,
                display: "grid", placeItems: "center",
              }}>
                <Icon name={k.ic} size={16} />
              </div>
              <span style={{ fontSize: 12, color: "var(--ink-soft)", fontWeight: 500 }}>{k.lbl}</span>
            </div>
            <div style={{ fontSize: 32, fontWeight: 700, letterSpacing: "-0.02em", lineHeight: 1 }}>{k.num}</div>
            <div style={{ fontSize: 11.5, color: "var(--ink-mute)", marginTop: 8 }}>{k.trend}</div>
          </div>
        ))}
      </div>

      <div className="card" style={{ marginBottom: 22 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
          <h3 className="card-title" style={{ margin: 0 }}>{t("activity_12")}</h3>
          <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11.5, color: "var(--ink-soft)" }}>
            {t("less")}
            {HEAT_COLORS.map((c, i) => (
              <span key={i} style={{ width: 12, height: 12, borderRadius: 3, background: c, display: "inline-block" }}></span>
            ))}
            {t("more")}
          </div>
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "flex-start", justifyContent: "center" }}>
          <div style={{
            display: "grid",
            gridTemplateRows: "repeat(7, 22px)",
            gap: 4, fontSize: 10.5, color: "var(--ink-mute)",
          }}>
            {["T2", "T3", "T4", "T5", "T6", "T7", "CN"].map((d, i) => (
              <span key={d} style={{
                display: "flex", alignItems: "center",
                visibility: (i === 0 || i === 2 || i === 4 || i === 6) ? "visible" : "hidden",
                lineHeight: 1, height: 22,
              }}>{d}</span>
            ))}
          </div>
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(12, 22px)",
            gridTemplateRows: "repeat(7, 22px)",
            gridAutoFlow: "column",
            gap: 4,
          }}>
            {heatmap.map((v, i) => (
              <div key={i} style={{ background: HEAT_COLORS[v], borderRadius: 4 }}></div>
            ))}
          </div>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 10, fontSize: 11, color: "var(--ink-mute)" }}>
          <span>{t("weeks_ago")}</span>
          <span>{t("today_label")}</span>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.3fr 1fr", gap: 20 }}>
        <div className="card">
          <h3 className="card-title">{t("progress_hsk")}</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {accuracy.map(a => {
              const pct = (a.learned / a.total) * 100;
              const pctU = (a.unsure / a.total) * 100;
              const pctW = (a.weak / a.total) * 100;
              return (
                <div key={a.level}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                    <div style={{ fontWeight: 600, fontSize: 13.5 }}>HSK {a.level}</div>
                    <div style={{ fontSize: 12, color: "var(--ink-soft)" }}>
                      <strong style={{ color: "var(--ink)" }}>{a.learned}</strong> / {a.total} {t("words_unit")}
                      <span style={{ marginLeft: 10, color: "var(--pink-deep)" }}>{Math.round(pct)}%</span>
                    </div>
                  </div>
                  <div style={{ display: "flex", height: 10, borderRadius: 999, background: "var(--pink-pale)", overflow: "hidden" }}>
                    <div style={{ width: `${pct}%`, background: "var(--green)" }}></div>
                    <div style={{ width: `${pctU}%`, background: "var(--yellow)" }}></div>
                    <div style={{ width: `${pctW}%`, background: "var(--red)" }}></div>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="legend" style={{ marginTop: 16 }}>
            <div className="legend-item"><span className="swatch" style={{ background: "var(--green)" }}></span>{t("learned")}</div>
            <div className="legend-item"><span className="swatch" style={{ background: "var(--yellow)" }}></span>{t("unsure")}</div>
            <div className="legend-item"><span className="swatch" style={{ background: "var(--red)" }}></span>{t("weak")}</div>
            <div className="legend-item"><span className="swatch" style={{ background: "var(--pink-pale)" }}></span>{t("unstudied")}</div>
          </div>
        </div>

        <div className="card">
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
            <h3 className="card-title" style={{ margin: 0 }}>{t("achievements")}</h3>
            <span style={{ fontSize: 12, color: "var(--ink-soft)" }}>
              <strong style={{ color: "var(--pink-deep)" }}>{earnedCount}</strong> / {achievements.length} {t("unlocked")}
            </span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {achievements.map(a => (
              <div key={a.id} style={{
                display: "flex", alignItems: "center", gap: 12,
                padding: "10px 12px", borderRadius: 12,
                background: a.earned ? "var(--elev)" : "transparent",
                opacity: a.earned ? 1 : 0.5,
              }}>
                <div style={{
                  width: 36, height: 36, borderRadius: 10,
                  background: a.earned ? a.color : "var(--surface-2)",
                  color: a.earned ? "#fff" : "var(--ink-mute)",
                  display: "grid", placeItems: "center", flexShrink: 0,
                }}>
                  <Icon name={a.icon} size={16} stroke={2} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 13.5 }}>{a.title}</div>
                  <div style={{ fontSize: 11.5, color: "var(--ink-soft)" }}>{a.sub}</div>
                </div>
                {a.earned && <div style={{ color: "var(--green)" }}><Icon name="check" size={16} stroke={2.4} /></div>}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
