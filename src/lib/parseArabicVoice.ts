import type { TxType } from "./storage";

export type ParsedVoice = {
  type: TxType | null;
  amount: number | null;
  name: string;
};

const ARABIC_INDIC = "٠١٢٣٤٥٦٧٨٩";
const PERSIAN = "۰۱۲۳۴۵۶۷۸۹";

function normalizeDigits(s: string): string {
  let out = "";
  for (const ch of s) {
    const a = ARABIC_INDIC.indexOf(ch);
    if (a >= 0) {
      out += String(a);
      continue;
    }
    const p = PERSIAN.indexOf(ch);
    if (p >= 0) {
      out += String(p);
      continue;
    }
    out += ch;
  }
  return out;
}

function normalizeText(s: string): string {
  return normalizeDigits(s)
    .replace(/[إأآا]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/ؤ/g, "و")
    .replace(/ئ/g, "ي")
    .replace(/[ًٌٍَُِّْـ]/g, "")
    .replace(/[.,،؛!?؟]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const UNITS: Record<string, number> = {
  "صفر": 0,
  "واحد": 1,
  "واحده": 1,
  "اثنين": 2,
  "اثنان": 2,
  "اتنين": 2,
  "ثلاثه": 3,
  "ثلاث": 3,
  "تلاته": 3,
  "اربعه": 4,
  "اربع": 4,
  "خمسه": 5,
  "خمس": 5,
  "سته": 6,
  "ست": 6,
  "سبعه": 7,
  "سبع": 7,
  "ثمانيه": 8,
  "ثماني": 8,
  "ثمان": 8,
  "تمانيه": 8,
  "تسعه": 9,
  "تسع": 9,
  "عشره": 10,
  "عشر": 10,
};

const HUNDREDS: Record<string, number> = {
  "مايه": 100,
  "مئه": 100,
  "ميه": 100,
  "مايتين": 200,
  "مئتين": 200,
  "ميتين": 200,
  "ثلاثمايه": 300,
  "ثلاثمئه": 300,
  "تلتمايه": 300,
  "اربعمايه": 400,
  "اربعمئه": 400,
  "خمسمايه": 500,
  "خمسمئه": 500,
  "ستمايه": 600,
  "ستمئه": 600,
  "سبعمايه": 700,
  "سبعمئه": 700,
  "ثمنمايه": 800,
  "ثمانمايه": 800,
  "ثمانمئه": 800,
  "تسعمايه": 900,
  "تسعمئه": 900,
};

const THOUSAND_WORDS = new Set(["الف", "الاف", "آلاف"]);
const MILLION_WORDS = new Set(["مليون", "ملايين"]);

// Tokens to strip from name after parsing
const CURRENCY_WORDS = new Set([
  "جنيه",
  "جنية",
  "ريال",
  "دينار",
  "درهم",
  "ليره",
  "ليرة",
  "دولار",
  "يورو",
  "قرش",
  "هلله",
]);
const FILLER = new Set(["و", "علي", "على", "ل", "من", "الي", "إلى", "الى", "يا"]);

function parseAmountFromTokens(tokens: string[]): {
  amount: number | null;
  consumed: Set<number>;
} {
  const consumed = new Set<number>();

  // 1) numeric token wins
  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i];
    if (/^\d+(\.\d+)?$/.test(t)) {
      consumed.add(i);
      // consume adjacent "الف/مليون"
      let mul = 1;
      if (i + 1 < tokens.length) {
        const nxt = tokens[i + 1];
        if (THOUSAND_WORDS.has(nxt)) {
          mul = 1000;
          consumed.add(i + 1);
        } else if (MILLION_WORDS.has(nxt)) {
          mul = 1_000_000;
          consumed.add(i + 1);
        }
      }
      // strip trailing currency
      if (i + 1 < tokens.length && CURRENCY_WORDS.has(tokens[i + 1])) {
        consumed.add(i + 1);
      }
      return { amount: Number(t) * mul, consumed };
    }
  }

  // 2) words-based
  let total = 0;
  let current = 0;
  let matchedAny = false;
  const localConsumed = new Set<number>();

  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i];
    if (t === "و") {
      // connector, keep going
      if (matchedAny) localConsumed.add(i);
      continue;
    }
    if (HUNDREDS[t] !== undefined) {
      current += HUNDREDS[t];
      matchedAny = true;
      localConsumed.add(i);
      continue;
    }
    if (UNITS[t] !== undefined) {
      // "خمسة آلاف" -> unit * 1000
      const next = tokens[i + 1];
      if (next && THOUSAND_WORDS.has(next)) {
        total += (UNITS[t] || 1) * 1000;
        localConsumed.add(i);
        localConsumed.add(i + 1);
        matchedAny = true;
        i++;
        continue;
      }
      if (next && MILLION_WORDS.has(next)) {
        total += (UNITS[t] || 1) * 1_000_000;
        localConsumed.add(i);
        localConsumed.add(i + 1);
        matchedAny = true;
        i++;
        continue;
      }
      current += UNITS[t];
      matchedAny = true;
      localConsumed.add(i);
      continue;
    }
    if (THOUSAND_WORDS.has(t)) {
      // "الف" alone -> 1000
      total += (current || 1) * 1000;
      current = 0;
      matchedAny = true;
      localConsumed.add(i);
      continue;
    }
    if (t === "الفين") {
      total += 2000;
      matchedAny = true;
      localConsumed.add(i);
      continue;
    }
    if (MILLION_WORDS.has(t)) {
      total += (current || 1) * 1_000_000;
      current = 0;
      matchedAny = true;
      localConsumed.add(i);
      continue;
    }
    if (CURRENCY_WORDS.has(t)) {
      localConsumed.add(i);
      continue;
    }
  }
  total += current;
  if (!matchedAny) return { amount: null, consumed };
  // also consume connectors "و" that fell between
  for (const idx of localConsumed) consumed.add(idx);
  return { amount: total, consumed };
}

export function parseArabicVoice(raw: string): ParsedVoice {
  const text = normalizeText(raw);
  if (!text) return { type: null, amount: null, name: "" };
  const tokens = text.split(" ");

  let type: TxType | null = null;
  const typeConsumed = new Set<number>();
  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i];
    if (t === "دين" || t === "ديون" || t === "استلف" || t === "سلفه") {
      type = "debt";
      typeConsumed.add(i);
      break;
    }
    if (t === "جيب" || t === "مصروف" || t === "قبض" || t === "قبضت") {
      type = "pocket";
      typeConsumed.add(i);
      break;
    }
  }

  const { amount, consumed } = parseAmountFromTokens(tokens);

  const nameTokens: string[] = [];
  for (let i = 0; i < tokens.length; i++) {
    if (typeConsumed.has(i) || consumed.has(i)) continue;
    const t = tokens[i];
    if (FILLER.has(t)) continue;
    if (CURRENCY_WORDS.has(t)) continue;
    nameTokens.push(t);
  }
  const name = nameTokens.join(" ").trim();

  return { type, amount, name };
}
