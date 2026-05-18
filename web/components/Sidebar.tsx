"use client";

import { Icon } from "@/lib/icons";
import { useLang } from "@/lib/i18n";

type View = "dashboard" | "study" | "flash" | "stats" | "settings";

interface SidebarProps {
  view: View;
  onNav: (v: View) => void;
}

export function Sidebar({ view, onNav }: SidebarProps) {
  const { t } = useLang();
  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="brand-mark">汉</div>
        <div>
          <div className="brand-name">XīnHànzì</div>
          <div className="brand-sub">{t("brand_sub")}</div>
        </div>
      </div>

      <button className={`nav-item ${view === "dashboard" ? "active" : ""}`} onClick={() => onNav("dashboard")}>
        <span className="ic"><Icon name="home" size={18} /></span>
        {t("nav_dashboard")}
      </button>
      <button className={`nav-item ${view === "study" ? "active" : ""}`} onClick={() => onNav("study")}>
        <span className="ic"><Icon name="book" size={18} /></span>
        {t("nav_study")}
      </button>
      <button className={`nav-item ${view === "stats" ? "active" : ""}`} onClick={() => onNav("stats")}>
        <span className="ic"><Icon name="stats" size={18} /></span>
        {t("nav_stats")}
      </button>
      <button className={`nav-item ${view === "settings" ? "active" : ""}`} onClick={() => onNav("settings")}>
        <span className="ic"><Icon name="settings" size={18} /></span>
        {t("nav_settings")}
      </button>

      <div className="sidebar-footer">
        <div style={{ fontWeight: 600, color: "var(--ink)", marginBottom: 6 }}>{t("shortcuts")}</div>
        <div><span className="kbd">Space</span> {t("sc_flip")}</div>
        <div><span className="kbd">1</span><span className="kbd">2</span><span className="kbd">3</span> {t("sc_rate")}</div>
        <div><span className="kbd">←</span><span className="kbd">→</span> {t("sc_nav")}</div>
      </div>
    </aside>
  );
}
