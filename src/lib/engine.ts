import {
  CATEGORIES, COMMAND_INDEX, ALL_COMMANDS, MODELS, RELATED, MACROS, CORE64,
  type CommandDef, type Category,
} from "../data/commands";

/* ================= تطبيع النص العربي ================= */
export function normalize(s: string): string {
  return s
    .toLowerCase()
    .replace(/[\u064B-\u0652\u0670\u0640]/g, "")
    .replace(/[أإآ]/g, "ا")
    .replace(/ة/g, "ه")
    .replace(/[ى]/g, "ي")
    .replace(/ؤ/g, "و")
    .replace(/ئ/g, "ي");
}
const LATIN = /[a-z0-9]/;
function matchKeyword(normText: string, tokens: Set<string>, k: string): boolean {
  if (LATIN.test(k)) return tokens.has(k);
  return normText.includes(k);
}

/* ================= قواعد الكلمات المفتاحية → أوامر ================= */
const RULES: { k: string; c: string; w?: number }[] = [
  // منظورات
  { k: "360", c: "360view", w: 3 }, { k: "ايزومتري", c: "isometric", w: 3 }, { k: "isometric", c: "isometric", w: 3 },
  { k: "زوايا", c: "multiview", w: 2 }, { k: "زاويه", c: "multiview" }, { k: "منظور", c: "perspective" },
  { k: "علوي", c: "topdown" }, { k: "جوي", c: "aerial", w: 3 }, { k: "درون", c: "aerial", w: 3 }, { k: "drone", c: "aerial", w: 3 },
  { k: "بانوراما", c: "panoramic" }, { k: "panorama", c: "panoramic" },
  // هندسة
  { k: "تفكيك", c: "explodedview", w: 3 }, { k: "exploded", c: "explodedview", w: 3 },
  { k: "مقطع", c: "cutaway", w: 3 }, { k: "قطاع", c: "crosssection", w: 2 }, { k: "cutaway", c: "cutaway", w: 3 },
  { k: "blueprint", c: "blueprint", w: 3 }, { k: "مخطط ازرق", c: "blueprint", w: 3 },
  { k: "ابعاد", c: "dimensioned", w: 3 }, { k: "قياسات", c: "dimensioned", w: 3 },
  { k: "xray", c: "xray", w: 3 }, { k: "اشعه", c: "xray", w: 2 },
  { k: "wireframe", c: "wireframe", w: 3 }, { k: "wire", c: "wireframe" },
  { k: "شفاف", c: "transparent", w: 2 }, { k: "تروس", c: "mechanism", w: 3 }, { k: "ميكانيك", c: "mechanism", w: 3 },
  { k: "محرك", c: "mechanism", w: 2 }, { k: "تجميع", c: "assembly", w: 2 }, { k: "cad", c: "cad", w: 3 },
  // عمارة
  { k: "مخطط ارضي", c: "floorplan", w: 3 }, { k: "floorplan", c: "floorplan", w: 3 }, { k: "مسقط", c: "floorplan", w: 3 },
  { k: "واجهه", c: "facade", w: 3 }, { k: "facade", c: "facade", w: 3 },
  { k: "داخلي", c: "interior", w: 3 }, { k: "ديكور", c: "interior", w: 3 },
  { k: "فيلا", c: "floorplan", w: 2 }, { k: "مبني", c: "elevation", w: 2 }, { k: "عمراني", c: "urbanplan", w: 3 },
  { k: "حديقه", c: "landscape", w: 2 }, { k: "موقع عام", c: "siteplan", w: 3 }, { k: "كتل", c: "massing", w: 2 },
  // طبي
  { k: "تشريح", c: "anatomy", w: 3 }, { k: "قلب", c: "organ", w: 2 }, { k: "عضو", c: "organ", w: 2 },
  { k: "خليه", c: "cellular", w: 3 }, { k: "خلايا", c: "cellular", w: 3 }, { k: "مجهر", c: "microscopic", w: 3 },
  { k: "microscopic", c: "microscopic", w: 3 }, { k: "دماغ", c: "neural", w: 3 }, { k: "مخ", c: "neural", w: 2 },
  { k: "اعصاب", c: "neural", w: 3 }, { k: "جزيء", c: "molecular", w: 3 }, { k: "dna", c: "molecular", w: 3 },
  { k: "جراح", c: "surgical", w: 3 }, { k: "mri", c: "mri", w: 3 }, { k: "طبي", c: "medical", w: 2 },
  // مخططات
  { k: "انفوجرافيك", c: "infographic", w: 3 }, { k: "infographic", c: "infographic", w: 3 },
  { k: "خريطه ذهنيه", c: "mindmap", w: 3 }, { k: "mindmap", c: "mindmap", w: 3 }, { k: "mind map", c: "mindmap", w: 3 },
  { k: "تدفق", c: "flowchart", w: 3 }, { k: "flowchart", c: "flowchart", w: 3 },
  { k: "مقارن", c: "comparison", w: 3 }, { k: "خط زمني", c: "timeline", w: 3 }, { k: "timeline", c: "timeline", w: 3 },
  { k: "رسم توضيحي", c: "diagram", w: 2 }, { k: "diagram", c: "diagram", w: 2 },
  { k: "شبكه", c: "network", w: 2 }, { k: "نظام بيئي", c: "ecosystem", w: 3 }, { k: "دوره", c: "cycle", w: 2 },
  { k: "مراحل", c: "process", w: 2 }, { k: "عمليه", c: "process", w: 2 }, { k: "هرم", c: "hierarchy", w: 2 },
  { k: "شجره قرار", c: "decisiontree", w: 3 }, { k: "داشبورد", c: "dashboard", w: 3 }, { k: "dashboard", c: "dashboard", w: 3 },
  { k: "خريطه", c: "map", w: 2 }, { k: "رحله", c: "journey", w: 2 }, { k: "حراريه", c: "heatmap", w: 3 },
  // تصوير
  { k: "بورتريه", c: "portrait", w: 3 }, { k: "portrait", c: "portrait", w: 3 },
  { k: "منتج", c: "productshot", w: 2 }, { k: "طعام", c: "foodphoto", w: 3 }, { k: "شارع", c: "streetphoto", w: 2 },
  { k: "وثائقي", c: "documentary", w: 2 }, { k: "ازياء", c: "fashion", w: 3 }, { k: "موضه", c: "fashion", w: 2 },
  { k: "واقعي", c: "photorealistic", w: 3 }, { k: "photoreal", c: "photorealistic", w: 3 },
  { k: "topdown", c: "topdown", w: 3 }, { k: "flat", c: "topdown" }, { k: "longexposure", c: "longexposure", w: 3 },
  // سينمائي
  { k: "سينمائي", c: "cinematic", w: 3 }, { k: "cinematic", c: "cinematic", w: 3 },
  { k: "ستوري بورد", c: "storyboard", w: 3 }, { k: "storyboard", c: "storyboard", w: 3 },
  { k: "anamorphic", c: "anamorphic", w: 3 }, { k: "bokeh", c: "bokeh", w: 3 }, { k: "بوكيه", c: "bokeh", w: 3 },
  { k: "عمق الميدان", c: "shallowdof", w: 2 }, { k: "فيلم", c: "filmstill", w: 2 }, { k: "مشهد", c: "sceneplan", w: 2 },
  { k: "لقطات", c: "shotlist", w: 2 }, { k: "مطارده", c: "tracking", w: 2 },
  // إضاءة
  { k: "غروب", c: "goldenhour", w: 3 }, { k: "ذهبيه", c: "goldenhour", w: 3 }, { k: "golden", c: "goldenhour", w: 3 },
  { k: "نيون", c: "neon", w: 3 }, { k: "neon", c: "neon", w: 3 }, { k: "مطر", c: "rain", w: 3 },
  { k: "ثلج", c: "snow", w: 3 }, { k: "ضباب", c: "fog", w: 3 }, { k: "ليل", c: "night", w: 2 },
  { k: "شروق", c: "sunrise", w: 3 }, { k: "استوديو", c: "studio", w: 2 }, { k: "volumetric", c: "volumetriclight", w: 3 },
  { k: "دخان", c: "smoke", w: 2 }, { k: "اضاءه", c: "dramaticlight", w: 1 },
  // فنون
  { k: "الوان مائيه", c: "watercolor", w: 3 }, { k: "اكواريل", c: "watercolor", w: 3 }, { k: "watercolor", c: "watercolor", w: 3 },
  { k: "انمي", c: "anime", w: 3 }, { k: "anime", c: "anime", w: 3 }, { k: "مانجا", c: "manga", w: 3 },
  { k: "بيكسل", c: "pixelart", w: 3 }, { k: "pixel", c: "pixelart", w: 3 }, { k: "كرتون", c: "comic", w: 2 },
  { k: "كوميكس", c: "comic", w: 3 }, { k: "comic", c: "comic", w: 3 }, { k: "حبر", c: "ink", w: 3 },
  { k: "اسكتش", c: "pencil", w: 3 }, { k: "رصاص", c: "pencil", w: 3 }, { k: "فحم", c: "charcoal", w: 3 },
  { k: "قصص اطفال", c: "storybook", w: 3 }, { k: "storybook", c: "storybook", w: 3 }, { k: "طين", c: "clay", w: 3 },
  { k: "clay", c: "clay", w: 3 }, { k: "lowpoly", c: "lowpoly", w: 3 }, { k: "low poly", c: "lowpoly", w: 3 },
  { k: "زجاج معشق", c: "stainedglass", w: 3 }, { k: "ريترو", c: "retro", w: 3 }, { k: "retro", c: "retro", w: 3 },
  { k: "كولاج", c: "collage", w: 3 }, { k: "collage", c: "collage", w: 3 }, { k: "ريزو", c: "risograph", w: 3 },
  { k: "كونسبت", c: "conceptart", w: 3 }, { k: "concept", c: "conceptart", w: 2 }, { k: "رسم", c: "illustration", w: 1 },
  // تصميم
  { k: "لوجو", c: "logo", w: 3 }, { k: "logo", c: "logo", w: 3 }, { k: "شعار", c: "logo", w: 3 },
  { k: "بوستر", c: "poster", w: 3 }, { k: "poster", c: "poster", w: 3 }, { k: "غلاف", c: "cover", w: 3 },
  { k: "تايبوجرافي", c: "typography", w: 3 }, { k: "typography", c: "typography", w: 3 }, { k: "خط عربي", c: "typography", w: 3 },
  { k: "ايقون", c: "icon", w: 3 }, { k: "icon", c: "icon", w: 3 }, { k: "ستيكر", c: "sticker", w: 3 },
  { k: "ملصق", c: "sticker", w: 3 }, { k: "مجله", c: "magazine", w: 2 }, { k: "بروشور", c: "brochure", w: 3 },
  { k: "هويه", c: "branding", w: 3 }, { k: "branding", c: "branding", w: 3 }, { k: "moodboard", c: "moodboard", w: 3 },
  { k: "بالته", c: "colorpalette", w: 3 }, { k: "الوان", c: "colorpalette", w: 1 }, { k: "بانر", c: "banner", w: 2 },
  // منتج/تجاري
  { k: "موك", c: "mockup", w: 3 }, { k: "mockup", c: "mockup", w: 3 }, { k: "عبوه", c: "packaging", w: 3 },
  { k: "تغليف", c: "packaging", w: 3 }, { k: "packaging", c: "packaging", w: 3 }, { k: "اعلان", c: "advertisement", w: 3 },
  { k: "زجاجه", c: "productshot", w: 2 }, { k: "عطر", c: "luxuryproduct", w: 3 }, { k: "فاخر", c: "luxuryproduct", w: 3 },
  { k: "بيلبورد", c: "billboard", w: 3 }, { k: "كرت اعمال", c: "businesscard", w: 3 }, { k: "تيشيرت", c: "tshirt", w: 3 },
  { k: "كتالوج", c: "catalog", w: 3 }, { k: "ecommerce", c: "ecommerce", w: 3 }, { k: "متجر", c: "ecommerce", w: 2 },
  { k: "حملة", c: "commercial", w: 2 },
  // تحرير
  { k: "ازاله الخلفيه", c: "removebg", w: 3 }, { k: "حذف الخلفيه", c: "removebg", w: 3 }, { k: "الخلفيه", c: "backgroundswap", w: 1 },
  { k: "استبدال الخلفيه", c: "backgroundswap", w: 3 }, { k: "background", c: "backgroundswap", w: 2 },
  { k: "ترميم", c: "restore", w: 3 }, { k: "restore", c: "restore", w: 3 }, { k: "تلوين", c: "colorize", w: 3 },
  { k: "colorize", c: "colorize", w: 3 }, { k: "تكبير", c: "upscale", w: 3 }, { k: "upscale", c: "upscale", w: 3 },
  { k: "دقه", c: "upscale", w: 1 }, { k: "حذف", c: "remove", w: 2 }, { k: "عزل", c: "isolate", w: 3 },
  { k: "inpaint", c: "inpaint", w: 3 }, { k: "outpaint", c: "outpaint", w: 3 }, { k: "توسيع", c: "outpaint", w: 2 },
  { k: "ترجمه", c: "translate", w: 3 }, { k: "ريتوش", c: "enhance", w: 2 }, { k: "تحسين", c: "enhance", w: 2 },
  { k: "درجه لوني", c: "colorgrade", w: 3 },
  // ثبات
  { k: "نفس الشخصيه", c: "characterconsistency", w: 3 }, { k: "شخصيه ثابته", c: "characterconsistency", w: 3 },
  { k: "ثبات", c: "styleconsistency", w: 2 }, { k: "consistency", c: "characterconsistency", w: 3 },
  { k: "turnaround", c: "characterturnaround", w: 3 }, { k: "model sheet", c: "modelsheet", w: 3 },
  { k: "مرجع", c: "referencebased", w: 1 }, { k: "سلسله", c: "characterconsistency", w: 2 },
  // مفاهيم
  { k: "قبل وبعد", c: "beforeafter", w: 3 }, { k: "مستقبل", c: "future", w: 3 }, { k: "تطور", c: "evolution", w: 3 },
  { k: "استعاره", c: "metaphor", w: 3 }, { k: "مفهوم", c: "conceptualize", w: 1 }, { k: "رمزي", c: "symbolic", w: 2 },
  // سوشيال
  { k: "ugc", c: "ugc", w: 3 }, { k: "ريلز", c: "socialvisual", w: 2 }, { k: "تيك توك", c: "ugc", w: 2 },
  { k: "ثامبنيل", c: "thumbnail", w: 3 }, { k: "thumbnail", c: "thumbnail", w: 3 }, { k: "يوتيوب", c: "thumbnail", w: 2 },
  { k: "كاروسيل", c: "carousel", w: 3 }, { k: "carousel", c: "carousel", w: 3 }, { k: "سوشيال", c: "socialvisual", w: 3 },
  { k: "انستجرام", c: "socialpost", w: 2 }, { k: "بوست", c: "socialpost", w: 2 }, { k: "ملاحظ", c: "stickynotes", w: 2 },
  // تعلم
  { k: "eli5", c: "eli5", w: 3 }, { k: "مبسط", c: "simplify", w: 2 }, { k: "cheat", c: "cheatsheet", w: 3 },
  { k: "ملخص", c: "cheatsheet", w: 2 }, { k: "فلاش", c: "flashcards", w: 3 }, { k: "بطاقات", c: "flashcards", w: 2 },
  { k: "تشبيه", c: "analogy", w: 3 }, { k: "تعليم", c: "teachme", w: 2 }, { k: "شرح", c: "simplify", w: 1 },
  // أعمال
  { k: "swot", c: "swot", w: 3 }, { k: "سوات", c: "swot", w: 3 }, { k: "خريطه طريق", c: "roadmap", w: 3 },
  { k: "roadmap", c: "roadmap", w: 3 }, { k: "استراتيج", c: "strategy", w: 3 }, { k: "نموذج عمل", c: "businessmodel", w: 3 },
  { k: "pitch", c: "pitch", w: 3 }, { k: "استثماري", c: "pitch", w: 3 }, { k: "خطة عمل", c: "actionplan", w: 3 },
  { k: "خطه", c: "actionplan", w: 1 }, { k: "شركه", c: "strategy", w: 1 }, { k: "سوق", c: "marketmap", w: 2 },
  { k: "pestle", c: "pestle", w: 3 }, { k: "بورتر", c: "fiveforces", w: 3 },
];

/* ================= المادة/الموضوع: عربي → إنجليزي ================= */
const SUBJECT_MAP: [string, string][] = [
  ["قهوه", "a specialty coffee brand"], ["مطعم", "a restaurant"], ["عطر", "a luxury perfume bottle"],
  ["سياره", "a car"], ["سفينه", "a ship"], ["محرك", "a mechanical engine"], ["توربين", "a turbine"],
  ["قلب", "a human heart"], ["خليه", "a biological cell"], ["دماغ", "a human brain"], ["عين", "a human eye"],
  ["فيلا", "a modern villa"], ["منزل", "a house"], ["بيت", "a house"], ["مدينه", "a city"], ["مسجد", "a mosque"],
  ["جامعه", "a university campus"], ["مستشفي", "a hospital"], ["كوكب", "a planet"], ["روبوت", "a robot"],
  ["ساعه", "a wristwatch"], ["هاتف", "a smartphone"], ["حذاء", "sneakers"], ["حقيبه", "a leather bag"],
  ["كتاب", "a book"], ["مج", "a magazine"], ["طفل", "a child"], ["امراه", "a woman"], ["رجل", "a man"],
  ["قط", "a cat"], ["اسد", "a lion"], ["حصان", "a horse"], ["جبل", "a mountain"], ["بحر", "the sea"],
  ["صحراء", "a desert"], ["ماء", "water"], ["طاقه", "energy"], ["شمس", "the sun"], ["قمر", "the moon"],
  ["شجره", "a tree"], ["ورده", "a rose"], ["طائره", "an airplane"], ["قطار", "a train"], ["دراجه", "a motorcycle"],
  ["زجاجه", "a bottle"], ["عصير", "a juice drink"], ["شوكولا", "chocolate"], ["خبز", "artisan bread"],
  ["تطبيق", "a mobile app"], ["متجر", "an online store"], ["عياده", "a clinic"], ["جسر", "a bridge"],
  ["ملعب", "a stadium"], ["بنت", "a girl"], ["ولد", "a boy"], ["عائله", "a family"], ["سمكه", "a fish"],
];

const AR_NUMS: Record<string, number> = { "٠": 0, "١": 1, "٢": 2, "٣": 3, "٤": 4, "٥": 5, "٦": 6, "٧": 7, "٨": 8, "٩": 9 };
const NUM_WORDS: [string, number][] = [["عشر", 10], ["تسع", 9], ["ثمان", 8], ["سبع", 7], ["ست", 6], ["خمس", 5], ["اربع", 4], ["ثلاث", 3], ["اثنت", 2], ["اثنين", 2]];

/* ================= الأنواع ================= */
export interface FeatureFlags {
  text: boolean; arabicText: boolean; photo: boolean; edit: boolean;
  multi: boolean; consistency: boolean; count: number | null;
  ratio: string | null; countNote: string; ratioNote: string;
}
export interface ModelScore { modelId: string; name: string; ar: string; hue: string; score: number; pct: number; reasons: string[]; strengths: string; }
export interface PickedCommand { cmd: CommandDef; catId: string; catTitle: string; explicit: boolean; }
export interface Analysis {
  summary: string; subjectAr: string; subjectEn: string;
  cats: { id: string; title: string; en: string; score: number }[];
  commands: PickedCommand[]; models: ModelScore[];
  features: FeatureFlags; userText: string; stackLine: string;
}

/* ================= التحليل ================= */
export function analyze(raw: string, prev?: Analysis | null): Analysis | null {
  const text = raw.toLowerCase();
  const norm = normalize(text);
  const tokens = new Set(norm.split(/[^a-z0-9]+/).filter(Boolean));

  // أوامر صريحة /command
  const explicit = new Map<string, number>();
  for (const m of text.matchAll(/\/([a-z0-9]+)/g)) {
    let name = m[1];
    if (RELATED[name] && !COMMAND_INDEX.has(name)) name = RELATED[name];
    if (COMMAND_INDEX.has(name)) explicit.set(name, (explicit.get(name) ?? 0) + 5);
  }

  // قواعد الكلمات المفتاحية
  const cmdScore = new Map<string, number>(explicit);
  for (const r of RULES) {
    if (matchKeyword(norm, tokens, normalize(r.k))) {
      cmdScore.set(r.c, (cmdScore.get(r.c) ?? 0) + (r.w ?? 2));
    }
  }

  // فئات عامة
  const catScore = new Map<string, number>();
  for (const cat of CATEGORIES) {
    let s = 0;
    for (const k of cat.keywords) if (matchKeyword(norm, tokens, normalize(k))) s += 1;
    if (s > 0) catScore.set(cat.id, s);
  }

  // التقاط أوامر الفئات المشاركة
  const picked: PickedCommand[] = [];
  const usedCats = new Set<string>();
  const sorted = [...cmdScore.entries()].sort((a, b) => b[1] - a[1]);
  for (const [name] of sorted) {
    const hit = COMMAND_INDEX.get(name);
    if (!hit) continue;
    picked.push({ cmd: hit.cmd, catId: hit.cat.id, catTitle: hit.cat.title, explicit: explicit.has(name) });
    usedCats.add(hit.cat.id);
    if (picked.length >= 6) break;
  }
  // دعم من صدارة الفئة إن كانت الأوامر قليلة
  if (picked.length < 3) {
    const catRanked = [...catScore.entries()].sort((a, b) => b[1] - a[1]);
    for (const [cid] of catRanked) {
      if (picked.length >= 4) break;
      const cat = CATEGORIES.find((x) => x.id === cid);
      if (!cat) continue;
      for (const tname of cat.top) {
        if (picked.length >= 4) break;
        if (picked.some((p) => p.cmd.name === tname)) continue;
        const hit = COMMAND_INDEX.get(tname);
        if (hit) { picked.push({ cmd: hit.cmd, catId: hit.cat.id, catTitle: hit.cat.title, explicit: false }); usedCats.add(cid); }
      }
    }
  }

  // درجات الفئات النهائية
  for (const [name, s] of cmdScore) {
    const hit = COMMAND_INDEX.get(name);
    if (hit) catScore.set(hit.cat.id, (catScore.get(hit.cat.id) ?? 0) + s);
  }
  const cats = [...catScore.entries()]
    .map(([id, score]) => {
      const cat = CATEGORIES.find((x) => x.id === id)!;
      return { id, title: cat.title, en: cat.en, score };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);

  if (picked.length === 0 && cats.length === 0) return null;

  // الملامح
  const features: FeatureFlags = {
    text: /(نص|كتابه|كلمه|اسم|عباره|text|typography|حروف)/.test(norm),
    arabicText: /(خط عربي|عربي|بالعربيه|اسم عربي)/.test(norm),
    photo: /(واقعي|فوتو|تصوير|photo|realistic)/.test(norm) || usedCats.has("photo"),
    edit: usedCats.has("editing") || /(ارفق|صورتي|الصوره دي|هذه الصوره|عدل علي)/.test(norm),
    multi: ["storyboard", "carousel", "360view", "multiview", "characterturnaround", "sceneplan", "shotlist", "flashcards", "thenvsnow"].some((n) => cmdScore.has(n)),
    consistency: usedCats.has("consistency"),
    count: null, countNote: "", ratio: null, ratioNote: "",
  };

  // عدد الصور
  const numStr = norm.replace(/[٠-٩]/g, (d) => String(AR_NUMS[d]));
  const mCount = numStr.match(/(\d+)\s*(صور|لقط|صفح|panels|slides|مشاهد)/);
  if (mCount) { features.count = Math.min(24, parseInt(mCount[1], 10)); features.countNote = "كما حددت في طلبك"; }
  else {
    for (const [w, n] of NUM_WORDS) {
      if (norm.includes(w + " صور") || norm.includes(w + " لقط")) { features.count = n; features.countNote = "كما حددت في طلبك"; break; }
    }
  }
  if (features.count === null) {
    if (cmdScore.has("storyboard") || cmdScore.has("sceneplan")) { features.count = 6; features.countNote = "افتراضي للستوري بورد (6 لقطات)"; }
    else if (cmdScore.has("carousel") || cmdScore.has("flashcards")) { features.count = 5; features.countNote = "افتراضي للكاروسيل (5 شرائح)"; }
    else if (cmdScore.has("360view") || cmdScore.has("multiview") || cmdScore.has("characterturnaround")) { features.count = 4; features.countNote = "افتراضي للعرض متعدد الزوايا"; }
    else { features.count = 1; features.countNote = "صورة واحدة مركزة"; }
  }
  if (features.multi && features.count === 1) features.count = 4;

  // الأبعاد
  const mRatio = numStr.match(/(\d{1,2})\s*[:x×]\s*(\d{1,2})/);
  if (mRatio) { features.ratio = `${mRatio[1]}:${mRatio[2]}`; features.ratioNote = "كما حددت في طلبك"; }
  else if (/(مربع)/.test(norm)) { features.ratio = "1:1"; features.ratioNote = "مربع"; }
  else if (/(ستوري|ريلز|تيك توك|طولي)/.test(norm)) { features.ratio = "9:16"; features.ratioNote = "عمودي للسوشيال"; }
  else if (/(بانوراما|سينمائي)/.test(norm) || cmdScore.has("panoramic") || cmdScore.has("cinematic")) { features.ratio = "21:9"; features.ratioNote = "سينمائي عريض"; }
  else if (/(بوستر|غلاف|بروشور)/.test(norm) || cmdScore.has("poster") || cmdScore.has("cover")) { features.ratio = "2:3"; features.ratioNote = "طولي للمطبوعات"; }
  else if (cmdScore.has("floorplan") || cmdScore.has("siteplan")) { features.ratio = "4:3"; features.ratioNote = "مناسب للمساقط"; }
  else { features.ratio = "16:9"; features.ratioNote = "افتراضي واسع"; }

  // تقييم النماذج
  const modelScores = MODELS.map(() => 0);
  const reasons: string[][] = MODELS.map(() => []);
  const rate = (r: string, i: number) => parseInt(r[i], 10);
  for (const p of picked) {
    const w = p.explicit ? 2 : 1;
    for (let i = 0; i < 8; i++) modelScores[i] += rate(p.cmd.r, i) * w;
  }
  for (const cInfo of cats) {
    const cat = CATEGORIES.find((x) => x.id === cInfo.id)!;
    const tops = cat.top.map((t) => COMMAND_INDEX.get(t)).filter(Boolean);
    for (let i = 0; i < 8; i++) {
      const avg = tops.reduce((s, t) => s + rate(t!.cmd.r, i), 0) / Math.max(1, tops.length);
      modelScores[i] += avg * Math.min(3, cInfo.score) * 0.6;
    }
  }
  const boost = (idx: number, pts: number, why: string) => { modelScores[idx] += pts; if (pts >= 2) reasons[idx].push(why); };
  const I = (id: string) => MODELS.findIndex((m) => m.id === id);

  // تفضيل صريح من المستخدم لنموذج معين
  const MODEL_MENTIONS: [RegExp, string][] = [
    [/(gpt|chatgpt|dall)/, "gpt"],
    [/(gemini|nano banana|جيميناي)/, "gemini"],
    [/(qwen|كيون)/, "qwen"],
    [/(flux|فلوكس)/, "flux"],
    [/(midjourney|ميدجورني)/, "midjourney"],
    [/(firefly|فايرفلاي)/, "firefly"],
    [/(ideogram|ايديوجرام|ايديوغرام)/, "ideogram"],
    [/(sdxl|stable diffusion|ستيبل ديفيوجن)/, "sdxl"],
  ];
  for (const [re, id] of MODEL_MENTIONS) {
    if (re.test(norm)) boost(I(id), 9, "النموذج الذي فضّله المستخدم صراحة");
  }

  if (features.text && features.arabicText) {
    boost(I("qwen"), 5, "إتقان ممتاز للنصوص العربية داخل الصورة");
    boost(I("gemini"), 5, "دقة عالية في توليد الحروف العربية");
    boost(I("gpt"), 3, "التزام قوي بتعليمات النص");
  } else if (features.text) {
    boost(I("ideogram"), 5, "الأفضل عالميًا في التايبوجرافي داخل الصورة");
    boost(I("gpt"), 3, "نصوص دقيقة داخل التكوين");
    boost(I("qwen"), 2, "قدرات نصية قوية");
  }
  if (features.photo) {
    boost(I("flux"), 4, "واقعية تصويرية وخامات فائقة");
    boost(I("gpt"), 3, "فوتورياليزم ملتزم بالتفاصيل");
    boost(I("midjourney"), 2, "جماليات تصويرية خلابة");
  }
  if (features.edit) {
    boost(I("gemini"), 5, "تحرير مرجعي هو الأقوى حاليًا (Nano Banana)");
    boost(I("gpt"), 4, "تحرير حواري متعدد الخطوات");
    boost(I("firefly"), 2, "أدوات Generative Fill موثوقة");
  }
  if (features.consistency) {
    boost(I("gemini"), 4, "ثبات الهوية عبر سلسلة الصور");
    boost(I("gpt"), 3, "ذاكرة مرجعية داخل المحادثة");
  }
  if (features.multi) {
    boost(I("gpt"), 3, "توليد لوحات متعددة الصور باتساق");
    boost(I("gemini"), 3, "دمج مراجع متعددة في مخرجات متسقة");
  }
  if (usedCats.has("design")) boost(I("ideogram"), 3, "شعارات وهويات بجودة تصميمية");
  if (usedCats.has("design") || usedCats.has("product")) boost(I("firefly"), 2, "آمن تجاريًا للاستخدام التسويقي");
  if (usedCats.has("art")) { boost(I("midjourney"), 3, "حس فني وأسلوبي متفوق"); boost(I("flux"), 2, "تنوع أسلوبي نقي"); }
  if (usedCats.has("cinematic")) { boost(I("midjourney"), 3, "كادرات سينمائية مرجعية"); boost(I("flux"), 2, "إضاءة فيلمية واقعية"); }
  if (usedCats.has("engineering") || usedCats.has("architecture")) {
    boost(I("gpt"), 3, "دقة تقنية في المخططات والقطاعات");
    boost(I("gemini"), 2, "التزام هندسي بالتعليمات");
    boost(I("sdxl"), 1, "قابل للضبط عبر ControlNet");
  }
  if (usedCats.has("medical")) boost(I("gpt"), 2, "ضبط علمي يقلل الهلوسة التشريحية");
  if (reasons.every((r) => r.length === 0)) reasons[0].push("توازن عام قوي عبر الفئات المطلوبة");

  const maxScore = Math.max(...modelScores);
  const order = MODELS.map((m, i) => i).sort((a, b) => modelScores[b] - modelScores[a]).slice(0, 3);
  const models: ModelScore[] = order.map((i) => ({
    modelId: MODELS[i].id, name: MODELS[i].name, ar: MODELS[i].ar, hue: MODELS[i].hue, strengths: MODELS[i].strengths,
    score: Math.round(modelScores[i] * 10) / 10,
    pct: Math.max(38, Math.round((modelScores[i] / maxScore) * 100)),
    reasons: reasons[i].slice(0, 2),
  }));

  // الموضوع
  const subjHits: string[] = [];
  const subjEn: string[] = [];
  for (const [ar, en] of SUBJECT_MAP) {
    if (norm.includes(ar) && !subjEn.includes(en)) { subjHits.push(ar); subjEn.push(en); if (subjEn.length >= 2) break; }
  }
  const subjectAr = subjHits.length ? subjHits.join(" + ") : "";
  const subjectEn = subjEn.length ? subjEn.join(" combined with ") : "";

  const stackLine = picked.map((p) => "/" + p.cmd.name).join(" + ");
  const catNames = cats.map((c) => c.title).join("، ");
  const notes: string[] = [];
  if (features.text) notes.push(features.arabicText ? "نص عربي داخل الصورة" : "نص/تايبوجرافي داخل الصورة");
  if (features.edit) notes.push("تعديل على صورة قائمة");
  if (features.consistency) notes.push("ثبات هوية عبر الصور");
  if (features.multi) notes.push("مخرجات متعددة الصور");
  if (features.photo) notes.push("طابع واقعي");

  const summary =
    `راجعت طلبك بدقة: ` +
    (subjectAr ? `الموضوع الأساسي «${subjectAr}» ضمن ` : ``) +
    `مجال ${catNames}. ` +
    (explicit.size ? `التقطت ${explicit.size} أمرًا صريحًا ذكرته، و` : ``) +
    `رشحت ${picked.length} أوامر بصرية من القاموس. ` +
    (notes.length ? `ملاحظات مؤثرة على اختيار النموذج: ${notes.join("، ")}.` : `لا قيود خاصة مكتشفة — الاختيار حسب جودة الفئة.`);

  return { summary, subjectAr, subjectEn, cats, commands: picked, models, features, userText: raw.trim(), stackLine };
}

/* ================= معلومات أمر مفرد ================= */
export interface CommandInfo {
  cmd: CommandDef; cat: Category; relatedTo?: string; core: boolean;
  macros: typeof MACROS; suggestions: string[];
}
export function commandInfo(name: string): CommandInfo | null {
  let n = name.toLowerCase().replace(/^\//, "");
  const relatedTo = !COMMAND_INDEX.has(n) && RELATED[n] ? RELATED[n] : undefined;
  if (relatedTo) n = relatedTo;
  const hit = COMMAND_INDEX.get(n);
  if (!hit) return null;
  return {
    cmd: hit.cmd, cat: hit.cat, relatedTo, core: CORE64.has(n),
    macros: MACROS.filter((m) => m.combo.includes("/" + n)),
    suggestions: MACROS.filter((m) => m.combo.includes("/" + n)).slice(0, 3).map((m) => m.combo.replace(/\//g, "")),
  };
}
export function isCommandQuery(text: string): boolean {
  const t = text.trim().toLowerCase();
  return /^\/[a-z0-9]+(\s*\+\s*\/[a-z0-9]+)*[؟?]?$/.test(t);
}

/* ================= توليد البرومبت الاحترافي ================= */
const PERSONA: Record<string, { ar: string; en: string }> = {
  multiview: { ar: "مخرج عروض منتج ثلاثية الأبعاد بخبرة استوديوهات Pixar الصناعية", en: "a world-class 3D presentation director" },
  engineering: { ar: "مهندس تصوير تقني يجمع بين دقة CAD وجماليات المخططات الكلاسيكية", en: "a precision technical-illustration engineer" },
  architecture: { ar: "معماري بصري بمدرسة ArchDaily: مساقط نظيفة وتقديم فراغي مقنع", en: "an award-winning architectural visualizer" },
  medical: { ar: "رسام طبي علمي بمستوى دوريات Nature — دقة تشريحية بلا مبالغة", en: "a scientific medical illustrator (Nature-grade accuracy)" },
  diagram: { ar: "مصمم معلومات (Information Designer) يحوّل التعقيد إلى وضوح بصري فوري", en: "an expert information designer" },
  photo: { ar: "مصور محترف بخبرة 20 عامًا في الإضاءة والتكوين", en: "a professional photographer with 20 years of experience" },
  cinematic: { ar: "مدير تصوير سينمائي (DP) بأسلوب مدارس A24 وVilleneuve", en: "a cinematic director of photography" },
  lighting: { ar: "فنان إضاءة وأجواء يتحكم بالضوء كأداة سرد", en: "a lighting & atmosphere artist" },
  art: { ar: "فنان بصري متعدد الأساليب يتقن الوسيط المطلوب حرفيًا", en: "a master visual artist in the requested medium" },
  design: { ar: "مدير فني للهويات البصرية بخبرة استوديوهات Pentagram", en: "a brand identity art director" },
  product: { ar: "مصور إعلانات تجارية للمنتجات الفاخرة", en: "a high-end commercial product photographer" },
  editing: { ar: "خبير ريتوش وتحرير توليدي يدمج AI بأدوات الاستوديو", en: "a generative retouch & compositing specialist" },
  consistency: { ar: "مشرف اتساق بصري لسلاسل الصور والشخصيات", en: "a visual continuity supervisor" },
  conceptual: { ar: "مفكر بصري يترجم المجرد إلى استعارات مفهومة فورًا", en: "a conceptual visual thinker" },
  social: { ar: "صانع محتوى بصري يفهم خوارزميات المنصات ولغة UGC", en: "a platform-native social content designer" },
  learning: { ar: "معلم بصري يبسّط أعقد الأفكار دون تفريط في الدقة", en: "a visual educator & explainer" },
  business: { ar: "مستشار استراتيجي يحوّل البيانات إلى قرارات بصرية", en: "a strategy consultant & data storyteller" },
};

export interface BuiltPrompt {
  title: string;
  meta: { model: string; stack: string; count: number; ratio: string; halluc: string; hallucPct: number };
  sections: { h: string; body: string }[];
  paste: string;
}

export function buildPrompt(a: Analysis): BuiltPrompt {
  const topCat = a.cats[0]?.id ?? "design";
  const persona = PERSONA[topCat] ?? PERSONA.design;
  const top = a.models[0];

  let halluc = "إبداعي متحكم به: 15–20%"; let hallucPct = 18;
  if (["engineering", "medical", "architecture", "diagram"].includes(topCat) || a.features.text) { halluc = "صارم: ≤ 5%"; hallucPct = 5; }
  else if (["photo", "cinematic", "product", "editing"].includes(topCat)) { halluc = "منخفض: ≤ 10%"; hallucPct = 10; }

  const count = a.features.count ?? 1;
  const ratio = a.features.ratio ?? "16:9";
  const subjectEn = a.subjectEn || "the exact subject described in the client brief";
  const ops = a.commands.map((p) => p.cmd.name).join(" + ");
  const cmdDetails = a.commands
    .map((p, i) => `${i + 1}. /${p.cmd.name} — ${p.cmd.fn} ← النتيجة: تطبيق هذه العملية البصرية على الموضوع مع الحفاظ على الاتساق بين كل المخرجات.`)
    .join("\n");

  const sections = [
    { h: "الشخصية (Persona)", body: `يتقمص النموذج دور: ${persona.ar}.\nYou are ${persona.en}, executing a precise visual brief — not improvising.` },
    { h: "المطلوب (Task)", body: `تنفيذ ${count > 1 ? `سلسلة من ${count} صور مترابطة` : "صورة واحدة"} لـ${a.subjectAr ? `«${a.subjectAr}»` : "الموضوع الموصوف في الطلب"} ضمن مجال: ${a.cats.map((c) => c.title).join(" + ")}. كل التفاصيل التالية إلزامية وليست اقتراحات.` },
    { h: "مجموعة الأوامر (Command Stack)", body: `التركيبة: ${a.stackLine}\n\n${cmdDetails}` },
    { h: "المخرجات النهائية المحددة", body: `• العدد: ${count} ${count > 1 ? "صور" : "صورة"} — ${a.features.countNote}\n• الأبعاد: ${ratio} (${a.features.ratioNote})\n• الدقة: 4K (3840×2160) أو أعلى، تفاصيل حادة، بلا artifacts\n• الصيغة: PNG/JPG عالية الجودة${a.features.consistency ? "\n• الاتساق: هوية بصرية واحدة (وجه/منتج/ألوان) ثابتة عبر كل الصور" : ""}` },
    { h: "ضبط الهلوسة (Hallucination Guardrails)", body: `السقف المحدد: ${halluc}\n• لا تضف عناصر غير مذكورة في البرومبت.\n${a.features.text ? "• النص المكتوب حرفيًا فقط — بلا حروف زائدة أو أخطاء إملائية.\n" : "• لا تكتب أي نص أو أرقام داخل الصورة إلا إذا طُلب صراحة.\n"}• دقة فيزيائية/تشريحية/هندسية: proportions صحيحة، اتصالات ميكانيكية منطقية.\n• Negative prompt: ${buildNegative(a)}` },
  ];

  const enBits: string[] = [];
  enBits.push(`You are ${persona.en}.`);
  enBits.push(`Create ${count > 1 ? `${count} coherent images` : "one image"} of ${subjectEn}.`);
  enBits.push(`Apply this visual operation stack in order: ${ops}.`);
  if (a.commands.some((p) => ["lighting", "art", "photo", "cinematic"].includes(p.catId)))
    enBits.push(a.commands.filter((p) => ["lighting", "art", "photo", "cinematic"].includes(p.catId)).map((p) => p.cmd.fn).join(", ") + ".");
  enBits.push(`Aspect ratio ${ratio}, ultra-detailed, professional-grade, physically accurate, coherent composition.`);
  if (a.features.text) enBits.push(`Render text exactly as specified in the brief — typographically flawless.`);
  enBits.push(`Strictly avoid: ${buildNegative(a)}.`);
  enBits.push(`Client brief (Arabic): "${a.userText}"`);

  return {
    title: a.subjectAr ? `برومبت «${a.subjectAr}»` : "البرومبت النهائي",
    meta: { model: top.ar, stack: a.stackLine, count, ratio, halluc, hallucPct },
    sections,
    paste: enBits.join(" "),
  };
}

function buildNegative(a: Analysis): string {
  const neg = ["deformed anatomy", "extra limbs", "watermark", "low quality", "jpeg artifacts"];
  if (a.features.text) neg.push("misspelled text", "extra letters");
  if (["engineering", "medical", "architecture"].includes(a.cats[0]?.id ?? "")) neg.push("impossible geometry", "wrong proportions");
  if (a.features.photo) neg.push("oversaturated", "plastic skin");
  return neg.join(", ");
}

/* ================= اقتراحات جاهزة ================= */
export const SUGGESTIONS: { label: string; text: string }[] = [
  { label: "انفوجرافيك أيزومتري", text: "اعمل انفوجرافيك يشرح دورة الماء في الطبيعة بأسلوب ايزومتري مع ألوان هادئة" },
  { label: "تفكيك هندسي", text: "أحتاج exploded view لمحرك سيارة بأسلوب blueprint مع أبعاد وقياسات" },
  { label: "لوجو بخط عربي", text: "صمم لوجو لبراند قهوة اسمه «مَدى» مع تايبوجرافي عربي راقٍ" },
  { label: "بورتريه سينمائي", text: "بورتريه سينمائي لامرأة تحت المطر بإضاءة نيون وعمق ميدان ضحل" },
  { label: "مخطط معماري", text: "مخطط أرضي لفيلا مودرن مع مقطع معماري يوضح الفراغات" },
  { label: "ستوري بورد", text: "ستوري بورد سينمائي من 6 لقطات لمشهد مطاردة في أزقة قديمة وقت الغروب" },
  { label: "ترميم صورة", text: "أريد ترميم وتلوين صورة عائلية قديمة مع تحسين الدقة" },
];

export { ALL_COMMANDS };
