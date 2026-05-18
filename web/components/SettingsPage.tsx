"use client";

import { useState, useEffect } from "react";
import { Icon } from "@/lib/icons";
import { useLang } from "@/lib/i18n";
import type { Lang } from "@/lib/i18n";

export function SettingsPage() {
  const { t, lang, setLang } = useLang();
  const [goal, setGoal] = useState(20);
  const [reminderTime, setReminderTime] = useState("19:00");
  const [reminderOn, setReminderOn] = useState(true);
  const [autoFlip, setAutoFlip] = useState(false);
  const [autoSpeak, setAutoSpeak] = useState(true);
  const [speakRate, setSpeakRate] = useState(0.85);
  const [showPinyin, setShowPinyin] = useState(true);
  const [shuffle, setShuffle] = useState(false);
  const [theme, setTheme] = useState(() =>
    (typeof window !== "undefined" ? document.body.getAttribute("data-theme") : null) || "pink"
  );
  const [voice, setVoice] = useState("female");

  useEffect(() => {
    document.body.setAttribute("data-theme", theme);
    localStorage.setItem("xh-theme", theme);
  }, [theme]);

  const themes = [
    { id: "pink", name: t("theme_pink"), c1: "#fce4ea", c2: "#e58aa0", sub: t("theme_pink_sub") },
    { id: "mint", name: t("theme_mint"), c1: "#dff2e8", c2: "#4fb389", sub: t("theme_mint_sub") },
    { id: "dark", name: t("theme_dark"), c1: "#1a1620", c2: "#e58aa0", sub: t("theme_dark_sub") },
  ];

  function Section({ title, sub, children }: { title: string; sub?: string; children: React.ReactNode }) {
    return (
      <div className="card" style={{ marginBottom: 18 }}>
        <div style={{ marginBottom: 18 }}>
          <h3 className="card-title" style={{ marginBottom: 4 }}>{title}</h3>
          {sub && <div style={{ fontSize: 12.5, color: "var(--ink-soft)" }}>{sub}</div>}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          {children}
        </div>
      </div>
    );
  }

  function Row({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
    return (
      <div style={{
        display: "flex", alignItems: "center", gap: 16,
        padding: "14px 0",
        borderTop: "1px solid rgba(0,0,0,0.04)",
      }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 500, fontSize: 13.5 }}>{label}</div>
          {hint && <div style={{ fontSize: 11.5, color: "var(--ink-soft)", marginTop: 2 }}>{hint}</div>}
        </div>
        <div>{children}</div>
      </div>
    );
  }

  function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
    return (
      <button
        onClick={() => onChange(!checked)}
        style={{
          width: 44, height: 26, borderRadius: 999,
          background: checked ? "var(--pink)" : "#e3d0d6",
          position: "relative",
          transition: "background .15s",
        }}>
        <span style={{
          position: "absolute", top: 3,
          left: checked ? 21 : 3,
          width: 20, height: 20, borderRadius: "50%",
          background: "#fff",
          boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
          transition: "left .15s",
        }}></span>
      </button>
    );
  }

  const inputStyle: React.CSSProperties = {
    background: "var(--surface-2)",
    border: "1px solid transparent",
    borderRadius: 10,
    padding: "8px 12px",
    fontSize: 13.5,
    fontFamily: "inherit",
    color: "var(--ink)",
    outline: "none",
    minWidth: 180,
  };

  const selectStyle: React.CSSProperties = {
    background: "var(--surface-2)",
    border: "1px solid transparent",
    borderRadius: 10,
    padding: "8px 28px 8px 12px",
    fontSize: 13.5,
    fontFamily: "inherit",
    color: "var(--ink)",
    outline: "none",
    appearance: "none",
    cursor: "pointer",
    backgroundImage: "url(\"data:image/svg+xml;charset=UTF-8,%3csvg width='12' height='8' viewBox='0 0 12 8' xmlns='http://www.w3.org/2000/svg'%3e%3cpath d='M1 1l5 5 5-5' stroke='%236b5a62' stroke-width='1.5' fill='none' stroke-linecap='round'/%3e%3c/svg%3e\")",
    backgroundRepeat: "no-repeat",
    backgroundPosition: "right 10px center",
  };

  return (
    <div className="main-inner" style={{ maxWidth: 860 }}>
      <div className="page-head">
        <div>
          <h1 className="page-title">{t("settings_title")}</h1>
          <p className="page-sub">{t("settings_sub")}</p>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 18, display: "flex", alignItems: "center", gap: 18 }}>
        <div style={{
          width: 64, height: 64, borderRadius: "50%",
          background: "linear-gradient(135deg, var(--pink) 0%, var(--purple) 100%)",
          color: "#fff", display: "grid", placeItems: "center",
          fontWeight: 700, fontSize: 26, letterSpacing: "-0.02em",
        }}>H</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: 17 }}>Hà</div>
          <div style={{ fontSize: 13, color: "var(--ink-soft)", fontStyle: "italic" }}>"Mỗi ngày một từ mới 🍵"</div>
          <div style={{
            display: "inline-flex", alignItems: "center", gap: 6,
            fontSize: 11.5, color: "var(--pink-deep)", fontWeight: 500,
            marginTop: 6, padding: "3px 10px", borderRadius: 999,
            background: "var(--pink-pale)", whiteSpace: "nowrap",
          }}>
            <Icon name="flame" size={12} stroke={2.2} /> {t("streak_badge")}
          </div>
        </div>
        <button style={{ padding: "8px 14px", borderRadius: 10, background: "var(--surface-2)", fontSize: 13, fontWeight: 500, color: "var(--ink)" }}>
          {t("edit")}
        </button>
      </div>

      <Section title={t("sec_goal")} sub={t("sec_goal_sub")}>
        <Row label={t("daily_goal")} hint={t("daily_goal_hint")}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <input type="range" min="5" max="100" step="5" value={goal}
              onChange={e => setGoal(+e.target.value)}
              style={{ width: 160, accentColor: "var(--pink-deep)" }} />
            <div style={{
              minWidth: 60, textAlign: "center",
              background: "var(--pink-pale)", color: "var(--pink-deep)",
              padding: "5px 10px", borderRadius: 8, fontWeight: 600, fontSize: 13,
            }}>{goal} {t("words_unit")}</div>
          </div>
        </Row>
        <Row label={t("daily_reminder")} hint={t("daily_reminder_hint")}>
          <Toggle checked={reminderOn} onChange={setReminderOn} />
        </Row>
        {reminderOn && (
          <Row label={t("reminder_time")} hint={t("reminder_time_hint")}>
            <input type="time" value={reminderTime} onChange={e => setReminderTime(e.target.value)}
              style={{ ...inputStyle, minWidth: 100 }} />
          </Row>
        )}
      </Section>

      <Section title={t("sec_session")} sub={t("sec_session_sub")}>
        <Row label={t("show_pinyin")} hint={t("show_pinyin_hint")}>
          <Toggle checked={showPinyin} onChange={setShowPinyin} />
        </Row>
        <Row label={t("auto_flip")} hint={t("auto_flip_hint")}>
          <Toggle checked={autoFlip} onChange={setAutoFlip} />
        </Row>
        <Row label={t("shuffle_default")} hint={t("shuffle_hint")}>
          <Toggle checked={shuffle} onChange={setShuffle} />
        </Row>
        <Row label={t("auto_speak")} hint={t("auto_speak_hint")}>
          <Toggle checked={autoSpeak} onChange={setAutoSpeak} />
        </Row>
        <Row label={t("speak_rate")} hint={`${speakRate.toFixed(2)}×`}>
          <input type="range" min="0.5" max="1.5" step="0.05" value={speakRate}
            onChange={e => setSpeakRate(+e.target.value)}
            style={{ width: 160, accentColor: "var(--pink-deep)" }} />
        </Row>
        <Row label={t("voice")} hint={t("voice_hint")}>
          <select value={voice} onChange={e => setVoice(e.target.value)} style={selectStyle}>
            <option value="female">♀ Mandarin</option>
            <option value="male">♂ Mandarin</option>
            <option value="kid">Kid Mandarin</option>
            <option value="tw">♀ Taiwanese</option>
          </select>
        </Row>
      </Section>

      <Section title={t("sec_theme")} sub={t("sec_theme_sub")}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, paddingTop: 6 }}>
          {themes.map(th => (
            <button key={th.id} onClick={() => setTheme(th.id)} style={{
              padding: 14, borderRadius: 14,
              background: th.id === "dark" ? "#1a1620" : "#fff",
              color: th.id === "dark" ? "#f0e6ea" : "var(--ink)",
              border: theme === th.id ? "2px solid var(--pink-deep)" : "2px solid transparent",
              textAlign: "left", transition: "border .12s",
            }}>
              <div style={{ display: "flex", gap: 4, marginBottom: 10 }}>
                <span style={{ flex: 1, height: 30, borderRadius: 8, background: th.c1 }}></span>
                <span style={{ width: 30, height: 30, borderRadius: 8, background: th.c2 }}></span>
              </div>
              <div style={{ fontSize: 13, fontWeight: 600 }}>{th.name}</div>
              <div style={{ fontSize: 11, opacity: 0.7, marginTop: 2 }}>{th.sub}</div>
              {theme === th.id && (
                <div style={{ fontSize: 11, color: "var(--pink-deep)", fontWeight: 500, marginTop: 4 }}>✓ {t("in_use")}</div>
              )}
            </button>
          ))}
        </div>
        <Row label={t("ui_lang")} hint={t("ui_lang_hint")}>
          <select value={lang} onChange={e => setLang(e.target.value as Lang)} style={selectStyle}>
            <option value="vi">Tiếng Việt</option>
            <option value="en">English</option>
            <option value="zh">中文 (简体)</option>
          </select>
        </Row>
      </Section>

      <Section title={t("sec_data")} sub={t("sec_data_sub")}>
        <Row label={t("export_data")} hint={t("export_hint")}>
          <button style={{ padding: "8px 14px", borderRadius: 10, background: "var(--surface-2)", fontSize: 13, fontWeight: 500, color: "var(--ink)" }}>
            {t("export_btn")}
          </button>
        </Row>
        <Row label={t("import_data")} hint={t("import_hint")}>
          <button style={{ padding: "8px 14px", borderRadius: 10, background: "var(--surface-2)", fontSize: 13, fontWeight: 500, color: "var(--ink)" }}>
            {t("pick_file")}
          </button>
        </Row>
        <Row label={t("reset_progress")} hint={t("reset_hint")}>
          <button style={{ padding: "8px 14px", borderRadius: 10, background: "var(--red-soft, #fde2e8)", color: "#963a4d", fontSize: 13, fontWeight: 500 }}>
            {t("reset_btn")}
          </button>
        </Row>
      </Section>

      <div style={{ textAlign: "center", fontSize: 11.5, color: "var(--ink-mute)", padding: "20px 0 8px" }}>
        XīnHànzì v1.0 · {t("footer")}
      </div>
    </div>
  );
}
