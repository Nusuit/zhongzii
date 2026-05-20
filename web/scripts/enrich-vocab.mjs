/**
 * Build vocabulary enrichment data from the bundled Hanzii HSK list and
 * CC-CEDICT. The generated app file intentionally updates pinyin only; the
 * audit report carries English senses for human review before Vietnamese
 * meanings are changed.
 *
 * Usage:
 *   node scripts/enrich-vocab.mjs              # HSK 1-5
 *   node scripts/enrich-vocab.mjs --levels=1,2,3
 *   node scripts/enrich-vocab.mjs --all        # HSK 1-6
 */

import { createGunzip } from "node:zlib";
import { createReadStream, createWriteStream, existsSync, readFileSync, writeFileSync } from "node:fs";
import { mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { pipeline } from "node:stream/promises";
import { Readable } from "node:stream";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const VOCAB_PATH = join(__dirname, "hanzii-vocab.json");
const DATA_DIR = join(__dirname, ".cache");
const CEDICT_GZ_PATH = join(DATA_DIR, "cedict_1_0_ts_utf-8_mdbg.txt.gz");
const CEDICT_TXT_PATH = join(DATA_DIR, "cedict_1_0_ts_utf-8_mdbg.txt");
const GENERATED_PATH = join(ROOT, "lib", "vocab-enrichment.generated.json");
const REPORT_PATH = join(__dirname, "vocab-enrichment-report.json");
const CEDICT_URL = "https://www.mdbg.net/chinese/export/cedict/cedict_1_0_ts_utf-8_mdbg.txt.gz";

const COMMON_PINYIN_OVERRIDES = {
  了: "le; liǎo",
  的: "de; dí; dì",
  得: "de; dé; děi",
  地: "de; dì",
  着: "zhe; zháo; zhuó",
  还: "hái; huán",
  行: "xíng; háng",
  长: "cháng; zhǎng",
  重: "zhòng; chóng",
  要: "yào; yāo",
  为: "wèi; wéi",
  和: "hé; hè; huó; huò; hú",
  差: "chà; chā; chāi; cī",
  少: "shǎo; shào",
  大: "dà; dài",
  都: "dōu; dū",
  给: "gěi; jǐ",
  哪: "nǎ; něi; na",
  那: "nà; nèi; nā",
  这: "zhè; zhèi",
  见: "jiàn; xiàn",
  教: "jiāo; jiào",
  传: "chuán; zhuàn",
  强: "qiáng; qiǎng; jiàng",
  乐: "lè; yuè",
  曾: "céng; zēng",
  薄: "báo; bó; bò",
  落: "luò; là; lào",
  降: "jiàng; xiáng",
  圈: "quān; juàn; juān",
  单: "dān; shàn",
  折: "zhé; shé; zhē",
  弹: "tán; dàn",
  调: "diào; tiáo",
  血: "xiě; xuè",
  数: "shù; shǔ",
  省: "shěng; xǐng",
  便宜: "piányi; biàn yí",
  大夫: "dàifu; dà fū",
  转: "zhuǎn; zhuàn",
  系: "xì; jì",
  将: "jiāng; jiàng",
  处: "chù; chǔ",
  种: "zhǒng; zhòng",
  应: "yīng; yìng",
  空: "kōng; kòng",
  挑: "tiāo; tiǎo",
  似: "sì; shì",
  载: "zài; zǎi",
  露: "lù; lòu",
  尽: "jǐn; jìn",
  参: "cān; shēn",
  更: "gèng; gēng",
  禁: "jìn; jīn",
  巷: "xiàng; hàng",
  盛: "shèng; chéng",
  当: "dāng; dàng",
};

const args = new Set(process.argv.slice(2));
const levelArg = process.argv.find((arg) => arg.startsWith("--levels="));
const LEVELS = args.has("--all")
  ? new Set([1, 2, 3, 4, 5, 6])
  : new Set(
      levelArg
        ? levelArg.slice("--levels=".length).split(",").map((x) => Number(x.trim())).filter(Boolean)
        : [1, 2, 3, 4, 5],
    );

const VOWEL_MARKS = {
  a: ["a", "ā", "á", "ǎ", "à"],
  e: ["e", "ē", "é", "ě", "è"],
  i: ["i", "ī", "í", "ǐ", "ì"],
  o: ["o", "ō", "ó", "ǒ", "ò"],
  u: ["u", "ū", "ú", "ǔ", "ù"],
  v: ["ü", "ǖ", "ǘ", "ǚ", "ǜ"],
  ü: ["ü", "ǖ", "ǘ", "ǚ", "ǜ"],
};

const TONELESS = new Map(
  Object.entries(VOWEL_MARKS).flatMap(([plain, forms]) =>
    forms.map((form) => [form, plain === "v" ? "ü" : plain]),
  ),
);

function normalizeUmlaut(s) {
  return s.replace(/u:/gi, "v").replace(/ü/g, "v").replace(/Ü/g, "v");
}

function numberedSyllableToTone(syllable) {
  const match = normalizeUmlaut(syllable).match(/^([a-zA-Zv:üÜ]+)([1-5])$/);
  if (!match) return syllable.replace(/v/g, "ü");

  const raw = match[1].toLowerCase();
  const tone = Number(match[2]);
  if (tone === 5) return raw.replace(/v/g, "ü");

  let idx = raw.indexOf("a");
  if (idx < 0) idx = raw.indexOf("e");
  if (idx < 0) idx = raw.indexOf("ou");
  if (idx < 0) {
    for (let i = raw.length - 1; i >= 0; i--) {
      if ("aeiouv".includes(raw[i])) {
        idx = i;
        break;
      }
    }
  }
  if (idx < 0) return raw.replace(/v/g, "ü");

  const vowel = raw[idx];
  const marked = VOWEL_MARKS[vowel]?.[tone] ?? vowel;
  return `${raw.slice(0, idx)}${marked}${raw.slice(idx + 1)}`.replace(/v/g, "ü");
}

function numberedPinyinToToneMarks(pinyin) {
  return pinyin
    .split(/\s+/)
    .map(numberedSyllableToTone)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}

function toneKey(pinyin) {
  return pinyin
    .replace(/ɑ/g, "a")
    .toLowerCase()
    .normalize("NFC")
    .replace(/[āáǎà]/g, "a")
    .replace(/[ēéěè]/g, "e")
    .replace(/[īíǐì]/g, "i")
    .replace(/[ōóǒò]/g, "o")
    .replace(/[ūúǔù]/g, "u")
    .replace(/[ǖǘǚǜü]/g, "v")
    .replace(/[^a-zv]+/g, "");
}

function splitCurrentPinyin(pinyin) {
  return String(pinyin ?? "")
    .replace(/ɑ/g, "a")
    .replace(/\([^)]*\)/g, (m) => `; ${m.slice(1, -1)} `)
    .split(/[;,/|]+/)
    .map((x) => x.trim())
    .filter(Boolean);
}

function isNoiseDefinition(def) {
  const d = def.toLowerCase();
  return (
    d.startsWith("surname ") ||
    d.includes("variant of ") ||
    d.includes("old variant of ") ||
    d.includes("erhua variant of ") ||
    d.includes("abbr. for ") ||
    d.includes("see also ")
  );
}

function cleanDefinition(def) {
  return def
    .replace(/^CL:.+$/i, "")
    .replace(/\s+/g, " ")
    .trim();
}

async function downloadCedict() {
  await mkdir(DATA_DIR, { recursive: true });
  if (existsSync(CEDICT_TXT_PATH)) return;

  if (!existsSync(CEDICT_GZ_PATH)) {
    console.log(`Downloading CC-CEDICT from ${CEDICT_URL}`);
    const res = await fetch(CEDICT_URL, {
      headers: {
        "User-Agent": "zhongzii-vocab-enrichment/1.0",
      },
    });
    if (!res.ok || !res.body) {
      throw new Error(`Failed to download CC-CEDICT: HTTP ${res.status}`);
    }
    await pipeline(Readable.fromWeb(res.body), createWriteStream(CEDICT_GZ_PATH));
  }

  console.log("Extracting CC-CEDICT");
  await pipeline(
    createReadStream(CEDICT_GZ_PATH),
    createGunzip(),
    createWriteStream(CEDICT_TXT_PATH),
  );
}

function parseCedict() {
  const map = new Map();
  const lines = readFileSync(CEDICT_TXT_PATH, "utf8").split(/\r?\n/);
  for (const line of lines) {
    if (!line || line.startsWith("#")) continue;
    const match = line.match(/^(\S+)\s+(\S+)\s+\[([^\]]+)]\s+\/(.+)\/$/);
    if (!match) continue;

    const [, traditional, simplified, numberedPinyin, rawDefs] = match;
    const definitions = rawDefs
      .split("/")
      .map(cleanDefinition)
      .filter(Boolean)
      .filter((def) => !isNoiseDefinition(def));
    if (!definitions.length) continue;

    const entry = {
      traditional,
      simplified,
      pinyin: numberedPinyinToToneMarks(numberedPinyin),
      definitions,
    };
    const items = map.get(simplified) ?? [];
    items.push(entry);
    map.set(simplified, items);
  }
  return map;
}

function unique(items) {
  return [...new Set(items.filter(Boolean))];
}

function build() {
  const vocab = JSON.parse(readFileSync(VOCAB_PATH, "utf8"))
    .filter((item) => LEVELS.has(item.level));
  const cedict = parseCedict();
  const generated = {};
  const report = {
    meta: {
      generatedAt: new Date().toISOString(),
      source: CEDICT_URL,
      levels: [...LEVELS].sort((a, b) => a - b),
      vocabCount: vocab.length,
    },
    pinyinUpdates: [],
    pinyinReviewCandidates: [],
    needsMeaningReview: [],
    noCedictMatch: [],
  };

  for (const word of vocab) {
    const entries = cedict.get(word.hanzi) ?? [];
    if (!entries.length) {
      report.noCedictMatch.push({
        level: word.level,
        hanzi: word.hanzi,
        pinyin: word.pinyin,
        meaning: word.meaning,
      });
      continue;
    }

    const cedictPinyins = unique(entries.map((entry) => entry.pinyin));
    const currentPinyins = splitCurrentPinyin(word.pinyin);
    const currentKeys = new Set(currentPinyins.map(toneKey));
    const missingPinyins = cedictPinyins.filter((p) => !currentKeys.has(toneKey(p)));

    const definitions = unique(entries.flatMap((entry) => entry.definitions)).slice(0, 6);
    const curatedPinyin = COMMON_PINYIN_OVERRIDES[word.hanzi];
    if (curatedPinyin) {
      const pinyin = curatedPinyin;
      generated[word.hanzi] = { pinyin };
      report.pinyinUpdates.push({
        level: word.level,
        hanzi: word.hanzi,
        current: word.pinyin,
        generated: pinyin,
        cedictDefinitions: definitions,
      });
    } else if (missingPinyins.length > 0) {
      report.pinyinReviewCandidates.push({
        level: word.level,
        hanzi: word.hanzi,
        current: word.pinyin,
        candidate: unique([...currentPinyins, ...missingPinyins]).join("; "),
        cedictDefinitions: definitions,
      });
    }

    const meaning = String(word.meaning ?? "").trim();
    if (definitions.length > 1 || meaning.length < 8) {
      report.needsMeaningReview.push({
        level: word.level,
        hanzi: word.hanzi,
        pinyin: generated[word.hanzi]?.pinyin ?? word.pinyin,
        currentMeaning: meaning,
        cedictDefinitions: definitions,
      });
    }
  }

  writeFileSync(GENERATED_PATH, `${JSON.stringify(generated, null, 2)}\n`, "utf8");
  writeFileSync(REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`, "utf8");

  console.log(`Generated ${Object.keys(generated).length} pinyin overrides: ${GENERATED_PATH}`);
  console.log(`Wrote review report: ${REPORT_PATH}`);
  console.log(`Meaning review candidates: ${report.needsMeaningReview.length}`);
  console.log(`No CC-CEDICT match: ${report.noCedictMatch.length}`);
}

await downloadCedict();
build();
