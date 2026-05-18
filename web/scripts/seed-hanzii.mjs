/**
 * Fetch HSK 1–6 vocabulary from Hanzii.net API and seed into Supabase.
 * Includes Sino-Vietnamese (Hán Việt) readings from hanzii.net/db/hanzi.json.
 *
 * Usage:
 *   node scripts/seed-hanzii.mjs
 *   SUPABASE_SERVICE_KEY=<key> node scripts/seed-hanzii.mjs   # bypass RLS
 *
 * Requires han_viet column in Supabase vocabularies table:
 *   ALTER TABLE vocabularies ADD COLUMN han_viet text;
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync, writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

// ── env ──────────────────────────────────────────────────────────────────────

const __dirname = dirname(fileURLToPath(import.meta.url));

function parseEnv(filePath) {
  try {
    return Object.fromEntries(
      readFileSync(filePath, "utf8")
        .split("\n")
        .filter(l => l.includes("=") && !l.startsWith("#"))
        .map(l => {
          const idx = l.indexOf("=");
          return [l.slice(0, idx).trim(), l.slice(idx + 1).trim()];
        })
    );
  } catch {
    return {};
  }
}

const env = parseEnv(join(__dirname, "../.env.local"));

const SUPABASE_URL =
  process.env.SUPABASE_URL || env["NEXT_PUBLIC_SUPABASE_URL"] || "";

const SUPABASE_KEY =
  process.env.SUPABASE_SERVICE_KEY ||
  process.env.SUPABASE_KEY ||
  env["SUPABASE_SERVICE_KEY"] ||
  env["NEXT_PUBLIC_SUPABASE_ANON_KEY"] ||
  "";

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("Missing SUPABASE_URL or SUPABASE_KEY. Check .env.local.");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// ── Hán Việt map ─────────────────────────────────────────────────────────────

async function fetchHanViet() {
  process.stdout.write("  Fetching hanzi.json (Hán Việt readings)...");
  const res = await fetch("https://hanzii.net/db/hanzi.json");
  if (!res.ok) throw new Error(`HTTP ${res.status} for hanzi.json`);
  const raw = await res.json();

  // Each entry is either a string "âm" or { "pinyin": "âm", ... } for polyphonic chars
  // We only want the primary reading (string) or first value if it's an object
  const map = {};
  for (const [char, val] of Object.entries(raw)) {
    if (typeof val === "string") {
      map[char] = val;
    } else if (typeof val === "object" && val !== null) {
      // Polyphonic — take the first reading
      map[char] = Object.values(val)[0];
    }
  }

  console.log(` ${Object.keys(map).length} chars loaded`);
  return map;
}

// ── Hanzii notebook fetch ─────────────────────────────────────────────────────

const LEVELS = ["hsk_1", "hsk_2", "hsk_3", "hsk_4", "hsk_5", "hsk_6"];
const BASE = "https://api.hanzii.net/api/notebooks/free";
const FETCH_HEADERS = {
  Referer: "https://hanzii.net/",
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  Accept: "application/json",
};
const LIMIT = 500;

async function fetchLevelWords(levelId, levelNum, hanVietMap) {
  process.stdout.write(`  Fetching ${levelId}...`);

  const first = await fetch(`${BASE}/${levelId}?page=1&limit=${LIMIT}`, {
    headers: FETCH_HEADERS,
  });

  if (!first.ok) throw new Error(`HTTP ${first.status} for ${levelId}`);

  const firstData = await first.json();

  if (!firstData.result) {
    throw new Error(`Unexpected response: ${JSON.stringify(firstData).slice(0, 200)}`);
  }

  let words = [...firstData.result];
  const total = firstData.total ?? words.length;
  const totalPages = Math.ceil(total / LIMIT);

  for (let page = 2; page <= totalPages; page++) {
    await sleep(300);
    const res = await fetch(`${BASE}/${levelId}?page=${page}&limit=${LIMIT}`, {
      headers: FETCH_HEADERS,
    });
    const d = await res.json();
    words = words.concat(d.result ?? []);
  }

  console.log(` ${words.length}/${total} words`);

  return words.map((w) => ({
    hanzi: w.w,
    pinyin: w.p || null,
    meaning: w.m || "",
    han_viet: hanVietMap[w.w] || null,
    example: null,
    level: levelNum,
  }));
}

// ── Supabase insert ───────────────────────────────────────────────────────────

const BATCH_SIZE = 200;

async function insertBatches(rows) {
  let inserted = 0;

  for (let start = 0; start < rows.length; start += BATCH_SIZE) {
    const batch = rows.slice(start, start + BATCH_SIZE);
    const { error } = await supabase.from("vocabularies").insert(batch);

    if (error) {
      console.error(`\nInsert error (rows ${start}–${start + batch.length}): ${error.message}`);

      if (start === 0 && error.message.includes("row-level security")) {
        console.log("\nRLS is blocking inserts with the anon key.");
        console.log("Get your service role key from Supabase dashboard → Settings → API, then:");
        console.log("  SUPABASE_SERVICE_KEY=<your-service-key> node scripts/seed-hanzii.mjs");
        process.exit(1);
      }

      if (start === 0 && error.message.includes("violates")) {
        console.log("\nHint: Table may already have data. Truncate first:");
        console.log("  TRUNCATE TABLE vocabularies RESTART IDENTITY CASCADE;");
        process.exit(1);
      }

      if (start === 0 && error.message.includes("han_viet")) {
        console.log("\nMissing column. Run this SQL in Supabase dashboard → SQL editor:");
        console.log("  ALTER TABLE vocabularies ADD COLUMN han_viet text;");
        process.exit(1);
      }

      console.log("Continuing with next batch...");
    } else {
      inserted += batch.length;
      process.stdout.write(`\r  Inserted: ${inserted}/${rows.length}`);
    }
  }

  console.log("");
  return inserted;
}

// ── main ─────────────────────────────────────────────────────────────────────

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function main() {
  console.log("=== Hanzii → Supabase seeder ===\n");

  // 1. Fetch Hán Việt map
  const hanVietMap = await fetchHanViet();

  // 2. Fetch all levels
  console.log("");
  const allVocab = [];
  for (let i = 0; i < LEVELS.length; i++) {
    const words = await fetchLevelWords(LEVELS[i], i + 1, hanVietMap);
    allVocab.push(...words);
    if (i < LEVELS.length - 1) await sleep(500);
  }

  const withHanViet = allVocab.filter(v => v.han_viet).length;
  console.log(`\nTotal: ${allVocab.length} words, ${withHanViet} with Hán Việt reading\n`);

  // 3. Save JSON backup
  const backupPath = join(__dirname, "hanzii-vocab.json");
  writeFileSync(backupPath, JSON.stringify(allVocab, null, 2), "utf8");
  console.log(`Backup saved: scripts/hanzii-vocab.json\n`);

  // 4. Insert to Supabase
  console.log("Inserting into Supabase vocabularies...");
  const inserted = await insertBatches(allVocab);

  console.log(`\nDone! ${inserted}/${allVocab.length} words inserted.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
