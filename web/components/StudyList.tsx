"use client";

import { Icon } from "@/lib/icons";
import { useLang } from "@/lib/i18n";

export const HSK_TOTALS: Record<number, number> = {
  1: 504,
  2: 764,
  3: 966,
  4: 995,
  5: 1448,
  6: 1217,
};

interface LevelProgress {
  learned: number;
  unsure: number;
  weak: number;
}

interface StudyListProps {
  progress: Record<number, LevelProgress>;
  levelTotals: Record<number, number>;
  onPickDeck: (level: number) => void;
}

export function StudyList({ progress, levelTotals, onPickDeck }: StudyListProps) {
  const { t } = useLang();
  const levels = [1, 2, 3, 4, 5, 6];
  const totalVocab = levels.reduce(
    (sum, lv) => sum + (levelTotals[lv] ?? HSK_TOTALS[lv] ?? 0),
    0,
  );

  return (
    <div className="main-inner">
      <div className="page-head">
        <div>
          <h1 className="page-title">{t("hsk_title")}</h1>
          <p className="page-sub">{t("hsk_sub")}</p>
        </div>
      </div>

      <div className="hsk-banner">
        <div className="hsk-banner-ic"><Icon name="sparkle" size={20} /></div>
        <div className="hsk-banner-text">
          {t("hsk_banner")}
          <br />{t("total_words")} <strong>{totalVocab.toLocaleString("vi")}</strong> {t("vocab_unit")}.
        </div>
      </div>

      <div className="hsk-grid">
        {levels.map(lv => {
          const total = levelTotals[lv] ?? HSK_TOTALS[lv] ?? 0;
          const p = progress[lv] || { learned: 0, unsure: 0, weak: 0 };
          const pct = Math.round((p.learned / total) * 100);
          return (
            <button key={lv} className="hsk-card" onClick={() => onPickDeck(lv)}>
              <div className="hsk-card-row" style={{ marginBottom: 0 }}>
                <div>
                  <div className="hsk-card-label">{t("level")}</div>
                  <div className="hsk-card-title">HSK {lv}</div>
                </div>
                <div className="hsk-card-cta"><Icon name="arrow-right" size={16} /></div>
              </div>
              <div className="hsk-card-row">
                <div className="hsk-card-meta"><strong>{total.toLocaleString("vi")}</strong> {t("vocab_unit")}</div>
                <div className="hsk-card-meta">{pct}{t("percent_done")}</div>
              </div>
              <div className="hsk-card-progress">
                <div className="hsk-card-progress-fill" style={{ width: `${pct}%` }}></div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

interface ModePickerProps {
  level: number;
  counts: { green: number; yellow: number; red: number; purple: number };
  dbEmpty?: boolean;
  onChoose: (mode: string) => void;
  onClose: () => void;
}

export function ModePicker({ level, counts, dbEmpty = false, onChoose, onClose }: ModePickerProps) {
  const { t } = useLang();
  const all = counts.green + counts.yellow + counts.red + counts.purple;
  const modes = [
    { id: "all", title: t("mode_all"), sub: t("mode_all_sub"), count: all, ic: "all", icon: "deck" },
    { id: "new", title: t("mode_new"), sub: t("mode_new_sub"), count: counts.purple, ic: "purple", icon: "sparkle" },
    { id: "weak", title: t("mode_weak"), sub: t("mode_weak_sub"), count: counts.red, ic: "red", icon: "x" },
    { id: "unsure", title: t("mode_unsure"), sub: t("mode_unsure_sub"), count: counts.yellow, ic: "yellow", icon: "question" },
    { id: "learned", title: t("mode_learned"), sub: t("mode_learned_sub"), count: counts.green, ic: "green", icon: "check" },
    { id: "shuffle", title: t("mode_shuffle"), sub: t("mode_shuffle_sub"), count: all, ic: "all", icon: "shuffle" },
  ];

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <h3 className="modal-title">HSK {level} — {t("pick_mode")}</h3>
        {dbEmpty && (
          <div style={{
            margin: "0 0 14px",
            padding: "10px 14px",
            borderRadius: 10,
            background: "#fff3cd",
            color: "#856404",
            fontSize: 13,
            lineHeight: 1.5,
          }}>
            ⚠️ Chưa có từ vựng trong cơ sở dữ liệu. Cần chạy seed script để nạp dữ liệu.
          </div>
        )}
        <div className="mode-list" style={{ opacity: dbEmpty ? 0.45 : 1, pointerEvents: dbEmpty ? "none" : "auto" }}>
          {modes.map(m => (
            <button key={m.id} className="mode-item" onClick={() => onChoose(m.id)}>
              <div className={`mode-ic ${m.ic}`}><Icon name={m.icon} size={16} stroke={2.2} /></div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="mode-title">{m.title}</div>
                <div className="mode-sub">{m.sub}</div>
              </div>
              <div className="mode-count">{m.count}</div>
            </button>
          ))}
        </div>
        <button className="modal-close" onClick={onClose}>{t("close")}</button>
      </div>
    </div>
  );
}
