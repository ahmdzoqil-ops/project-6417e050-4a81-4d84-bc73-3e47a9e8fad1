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
  "واحد": 1, "واحده": 1, "احد": 1,
  "اثنين": 2, "اثنان": 2, "اتنين": 2, "اتنان": 2,
  "ثلاثه": 3, "ثلاث": 3, "تلاته": 3, "تلات": 3,
  "اربعه": 4, "اربع": 4,
  "خمسه": 5, "خمس": 5,
  "سته": 6, "ست": 6,
  "سبعه": 7, "سبع": 7,
  "ثمانيه": 8, "ثماني": 8, "ثمان": 8, "تمانيه": 8, "تمان": 8,
  "تسعه": 9, "تسع": 9,
  "عشره": 10, "عشر": 10,
};

const TEENS: Record<string, number> = {
  "احدعشر": 11, "احداعشر": 11, "احدعشره": 11,
  "اثناعشر": 12, "اثنيعشر": 12, "اتناشر": 12, "اطناشر": 12,
  "ثلاثهعشر": 13, "ثلاثتعشر": 13,
  "اربعتاشر": 14, "اربعهعشر": 14,
  "خمستاشر": 15, "خمسهعشر": 15,
  "ستاشر": 16, "ستهعشر": 16,
  "سبعتاشر": 17, "سبعهعشر": 17,
  "ثمنتاشر": 18, "تمنتاشر": 18, "ثمانيهعشر": 18,
  "تسعتاشر": 19, "تسعهعشر": 19,
};

const TENS: Record<string, number> = {
  "عشرين": 20, "عشرون": 20,
  "ثلاثين": 30, "ثلاثون": 30, "تلاتين": 30,
  "اربعين": 40, "اربعون": 40,
  "خمسين": 50, "خمسون": 50,
  "ستين": 60, "ستون": 60,
  "سبعين": 70, "سبعون": 70,
  "ثمانين": 80, "ثمانون": 80, "تمانين": 80,
  "تسعين": 90, "تسعون": 90,
};

const HUNDREDS: Record<string, number> = {
  "مايه": 100, "مئه": 100, "ميه": 100, "ميّه": 100, "مايا": 100, "ميا": 100,
  "مايتين": 200, "مئتين": 200, "ميتين": 200, "متين": 200, "ميتان": 200,
  "ثلاثمايه": 300, "ثلاثمئه": 300, "تلتمايه": 300, "تلاتمايه": 300, "تلتميه": 300, "ثلاثميه": 300, "تلاتميه": 300,
  "اربعمايه": 400, "اربعمئه": 400, "اربعميه": 400, "ربعميه": 400, "ربعمايه": 400,
  "خمسمايه": 500, "خمسمئه": 500, "خمسميه": 500, "خمسميّه": 500,
  "ستمايه": 600, "ستمئه": 600, "ستميه": 600,
  "سبعمايه": 700, "سبعمئه": 700, "سبعميه": 700,
  "ثمنمايه": 800, "ثمانمايه": 800, "ثمانمئه": 800, "تمنمايه": 800, "تمانميه": 800, "ثمانميه": 800, "تمنميه": 800,
  "تسعمايه": 900, "تسعمئه": 900, "تسعميه": 900,
};

const THOUSAND_WORDS = new Set(["الف", "الاف", "آلاف", "تلاف"]);
const THOUSAND_TWO = new Set(["الفين", "الفان"]);
const MILLION_WORDS = new Set(["مليون", "ملايين"]);
const MILLION_TWO = new Set(["مليونين", "مليونان"]);

// "نص" / "نصف" after a thousand-scale means +500 (ألفين ونص = 2500).
const HALF_WORDS = new Set(["نص", "نصف", "النص", "النصف"]);

const CURRENCY_WORDS = new Set([
  "جنيه", "جنية", "جنيها",
  "ريال", "ريالا",
  "دينار", "دينارا",
  "درهم", "درهما",
  "ليره", "ليرة",
  "دولار", "دولارا",
  "يورو",
  "قرش", "قروش",
  "هلله",
]);

// Filler to strip from name. Keep proper names intact.
const FILLER = new Set([
  "ل", "من", "الي", "إلى", "الى", "يا", "ب", "بمبلغ", "مبلغ", "قيمه", "قيمته",
  "عليه", "عليها", "عليهم", "عنده", "عندها", "له", "لها", "لهم",
  "زد", "حط", "سجل", "اضف", "أضف", "ضيف", "دفع", "دفعت", "اكتب",
  "بس", "كمان", "يعني", "ايضا", "أيضا", "بقي", "بقى",
]);


function isNumberWord(t: string): boolean {
  return (
    UNITS[t] !== undefined ||
    TEENS[t] !== undefined ||
    TENS[t] !== undefined ||
    HUNDREDS[t] !== undefined ||
    THOUSAND_WORDS.has(t) ||
    THOUSAND_TWO.has(t) ||
    MILLION_WORDS.has(t) ||
    MILLION_TWO.has(t) ||
    /^\d+(\.\d+)?$/.test(t)
  );
}

function parseAmountFromTokens(tokens: string[]): {
  amount: number | null;
  consumed: Set<number>;
} {
  const consumed = new Set<number>();

  // Find contiguous number-word run (allow "و" connectors inside).
  let runStart = -1;
  let runEnd = -1;
  for (let i = 0; i < tokens.length; i++) {
    if (isNumberWord(tokens[i]) || CURRENCY_WORDS.has(tokens[i])) {
      if (runStart === -1) runStart = i;
      runEnd = i;
    } else if (tokens[i] === "و" && runStart !== -1) {
      // Only extend if next token is also a number word.
      const nxt = tokens[i + 1];
      if (nxt && (isNumberWord(nxt) || CURRENCY_WORDS.has(nxt))) {
        runEnd = i;
        continue;
      }
      // otherwise break
      if (runStart !== -1) break;
    } else if (runStart !== -1) {
      break;
    }
  }

  if (runStart === -1) return { amount: null, consumed };

  let total = 0;
  let current = 0; // accumulator for current "scale group" (< 1000)
  let matchedAny = false;

  const flushScale = (scale: number, defaultOne: boolean) => {
    if (current === 0) {
      if (defaultOne) total += 1 * scale;
    } else {
      total += current * scale;
      current = 0;
    }
  };

  for (let i = runStart; i <= runEnd; i++) {
    const t = tokens[i];
    if (t === "و") {
      consumed.add(i);
      continue;
    }
    if (CURRENCY_WORDS.has(t)) {
      consumed.add(i);
      continue;
    }
    if (/^\d+(\.\d+)?$/.test(t)) {
      current += Number(t);
      matchedAny = true;
      consumed.add(i);
      continue;
    }
    if (HUNDREDS[t] !== undefined) {
      current += HUNDREDS[t];
      matchedAny = true;
      consumed.add(i);
      continue;
    }
    if (TENS[t] !== undefined) {
      current += TENS[t];
      matchedAny = true;
      consumed.add(i);
      continue;
    }
    if (TEENS[t] !== undefined) {
      current += TEENS[t];
      matchedAny = true;
      consumed.add(i);
      continue;
    }
    if (UNITS[t] !== undefined) {
      current += UNITS[t];
      matchedAny = true;
      consumed.add(i);
      continue;
    }
    if (THOUSAND_TWO.has(t)) {
      total += 2000;
      matchedAny = true;
      consumed.add(i);
      continue;
    }
    if (THOUSAND_WORDS.has(t)) {
      flushScale(1000, true);
      matchedAny = true;
      consumed.add(i);
      continue;
    }
    if (MILLION_TWO.has(t)) {
      total += 2_000_000;
      matchedAny = true;
      consumed.add(i);
      continue;
    }
    if (MILLION_WORDS.has(t)) {
      flushScale(1_000_000, true);
      matchedAny = true;
      consumed.add(i);
      continue;
    }
  }

  total += current;
  if (!matchedAny) return { amount: null, consumed: new Set() };
  return { amount: total, consumed };
}

export function parseArabicVoice(raw: string): ParsedVoice {
  const text = normalizeText(raw);
  if (!text) return { type: null, amount: null, name: "" };
  const rawTokens = text.split(" ");
  // Split leading "و" from tokens like "ومئتين" -> ["و","مئتين"]
  const tokens: string[] = [];
  for (const t of rawTokens) {
    if (t.length > 1 && t.startsWith("و") && isNumberWord(t.slice(1))) {
      tokens.push("و", t.slice(1));
    } else {
      tokens.push(t);
    }
  }


  let type: TxType | null = null;
  const typeConsumed = new Set<number>();
  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i];
    if (t === "دين" || t === "ديون" || t === "استلف" || t === "سلفه" || t === "سلف" || t === "دينت") {
      type = "debt";
      typeConsumed.add(i);
      break;
    }
    if (t === "جيب" || t === "مصروف" || t === "قبض" || t === "قبضت" || t === "استلمت" || t === "استلم") {
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
  // Trim leading/trailing "و"
  while (nameTokens.length && nameTokens[0] === "و") nameTokens.shift();
  while (nameTokens.length && nameTokens[nameTokens.length - 1] === "و") nameTokens.pop();

  const name = nameTokens.join(" ").trim();

  return { type, amount, name };
}
