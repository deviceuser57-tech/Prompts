import {
  CATEGORIES, COMMAND_INDEX, ALL_COMMANDS, MODELS, RELATED, MACROS, CORE64,
  type CommandDef, type Category,
} from "../data/commands";

export type Bi = { ar: string; en: string };

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
  { k: "علوي", c: "topdown" }, { k: "جوي", c: "aerial", w: 3 }, { k: "درون", c: "aerial", w: 3 }, { k: "drone", c: "aerial", w: 3 }, { k: "aerial", c: "aerial", w: 3 },
  { k: "بانوراما", c: "panoramic" }, { k: "panorama", c: "panorama" }, { k: "panoramic", c: "panoramic" },
  { k: "close-up", c: "closeup", w: 2 }, { k: "closeup", c: "closeup", w: 2 }, { k: "لقطه قريبه", c: "closeup", w: 2 },
  { k: "عين الطائر", c: "birdseye", w: 3 }, { k: "birdseye", c: "birdseye", w: 3 },
  // هندسة
  { k: "تفكيك", c: "explodedview", w: 3 }, { k: "exploded", c: "explodedview", w: 3 },
  { k: "مقطع", c: "cutaway", w: 3 }, { k: "قطاع", c: "crosssection", w: 2 }, { k: "cutaway", c: "cutaway", w: 3 },
  { k: "blueprint", c: "blueprint", w: 3 }, { k: "مخطط ازرق", c: "blueprint", w: 3 },
  { k: "ابعاد", c: "dimensioned", w: 3 }, { k: "قياسات", c: "dimensioned", w: 3 }, { k: "dimensions", c: "dimensioned", w: 3 },
  { k: "xray", c: "xray", w: 3 }, { k: "x-ray", c: "xray", w: 3 }, { k: "اشعه", c: "xray", w: 2 },
  { k: "wireframe", c: "wireframe", w: 3 }, { k: "wire", c: "wireframe" },
  { k: "شفاف", c: "transparent", w: 2 }, { k: "تروس", c: "mechanism", w: 3 }, { k: "ميكانيك", c: "mechanism", w: 3 }, { k: "mechanical", c: "mechanism", w: 3 },
  { k: "محرك", c: "mechanism", w: 2 }, { k: "تجميع", c: "assembly", w: 2 }, { k: "cad", c: "cad", w: 3 },
  // عمارة
  { k: "مخطط ارضي", c: "floorplan", w: 3 }, { k: "floorplan", c: "floorplan", w: 3 }, { k: "floor plan", c: "floorplan", w: 3 }, { k: "مسقط", c: "floorplan", w: 3 },
  { k: "واجهه", c: "facade", w: 3 }, { k: "facade", c: "facade", w: 3 },
  { k: "داخلي", c: "interior", w: 3 }, { k: "ديكور", c: "interior", w: 3 }, { k: "interior", c: "interior", w: 3 },
  { k: "فيلا", c: "floorplan", w: 2 }, { k: "villa", c: "floorplan", w: 2 }, { k: "مبني", c: "elevation", w: 2 }, { k: "عمراني", c: "urbanplan", w: 3 },
  { k: "حديقه", c: "landscape", w: 2 }, { k: "موقع عام", c: "siteplan", w: 3 }, { k: "كتل", c: "massing", w: 2 },
  // طبي
  { k: "تشريح", c: "anatomy", w: 3 }, { k: "anatomy", c: "anatomy", w: 3 }, { k: "قلب", c: "organ", w: 2 }, { k: "heart", c: "organ", w: 2 }, { k: "عضو", c: "organ", w: 2 },
  { k: "خليه", c: "cellular", w: 3 }, { k: "خلايا", c: "cellular", w: 3 }, { k: "مجهر", c: "microscopic", w: 3 },
  { k: "microscopic", c: "microscopic", w: 3 }, { k: "دماغ", c: "neural", w: 3 }, { k: "مخ", c: "neural", w: 2 }, { k: "brain", c: "neural", w: 3 },
  { k: "اعصاب", c: "neural", w: 3 }, { k: "جزيء", c: "molecular", w: 3 }, { k: "dna", c: "molecular", w: 3 },
  { k: "جراح", c: "surgical", w: 3 }, { k: "mri", c: "mri", w: 3 }, { k: "طبي", c: "medical", w: 2 }, { k: "medical", c: "medical", w: 2 },
  // مخططات
  { k: "انفوجرافيك", c: "infographic", w: 3 }, { k: "infographic", c: "infographic", w: 3 },
  { k: "خريطه ذهنيه", c: "mindmap", w: 3 }, { k: "mindmap", c: "mindmap", w: 3 }, { k: "mind map", c: "mindmap", w: 3 },
  { k: "تدفق", c: "flowchart", w: 3 }, { k: "flowchart", c: "flowchart", w: 3 },
  { k: "مقارن", c: "comparison", w: 3 }, { k: "خط زمني", c: "timeline", w: 3 }, { k: "timeline", c: "timeline", w: 3 },
  { k: "رسم توضيحي", c: "diagram", w: 2 }, { k: "diagram", c: "diagram", w: 2 },
  { k: "شبكه", c: "network", w: 2 }, { k: "نظام بيئي", c: "ecosystem", w: 3 }, { k: "دوره", c: "cycle", w: 2 }, { k: "water cycle", c: "cycle", w: 3 },
  { k: "مراحل", c: "process", w: 2 }, { k: "عمليه", c: "process", w: 2 }, { k: "هرم", c: "hierarchy", w: 2 },
  { k: "شجره قرار", c: "decisiontree", w: 3 }, { k: "داشبورد", c: "dashboard", w: 3 }, { k: "dashboard", c: "dashboard", w: 3 },
  { k: "خريطه", c: "map", w: 2 }, { k: "رحله", c: "journey", w: 2 }, { k: "حراريه", c: "heatmap", w: 3 }, { k: "heatmap", c: "heatmap", w: 3 },
  // تصوير
  { k: "بورتريه", c: "portrait", w: 3 }, { k: "portrait", c: "portrait", w: 3 },
  { k: "منتج", c: "productshot", w: 2 }, { k: "product", c: "productshot", w: 2 }, { k: "طعام", c: "foodphoto", w: 3 }, { k: "شارع", c: "streetphoto", w: 2 }, { k: "street", c: "streetphoto", w: 2 },
  { k: "وثائقي", c: "documentary", w: 2 }, { k: "ازياء", c: "fashion", w: 3 }, { k: "موضه", c: "fashion", w: 2 }, { k: "fashion", c: "fashion", w: 3 },
  { k: "واقعي", c: "photorealistic", w: 3 }, { k: "photoreal", c: "photorealistic", w: 3 }, { k: "realistic", c: "photorealistic", w: 3 },
  { k: "topdown", c: "topdown", w: 3 }, { k: "flat-lay", c: "topdown", w: 2 }, { k: "flat lay", c: "topdown", w: 2 }, { k: "longexposure", c: "longexposure", w: 3 },
  // سينمائي
  { k: "سينمائي", c: "cinematic", w: 3 }, { k: "cinematic", c: "cinematic", w: 3 },
  { k: "ستوري بورد", c: "storyboard", w: 3 }, { k: "storyboard", c: "storyboard", w: 3 },
  { k: "anamorphic", c: "anamorphic", w: 3 }, { k: "bokeh", c: "bokeh", w: 3 }, { k: "بوكيه", c: "bokeh", w: 3 },
  { k: "عمق الميدان", c: "shallowdof", w: 2 }, { k: "depth of field", c: "shallowdof", w: 2 }, { k: "فيلم", c: "filmstill", w: 2 }, { k: "film", c: "filmstill", w: 2 }, { k: "مشهد", c: "sceneplan", w: 2 },
  { k: "لقطات", c: "shotlist", w: 2 }, { k: "مطارده", c: "tracking", w: 2 }, { k: "chase", c: "tracking", w: 2 },
  // إضاءة
  { k: "غروب", c: "goldenhour", w: 3 }, { k: "ذهبيه", c: "goldenhour", w: 3 }, { k: "golden", c: "goldenhour", w: 3 }, { k: "sunset", c: "sunset", w: 3 },
  { k: "نيون", c: "neon", w: 3 }, { k: "neon", c: "neon", w: 3 }, { k: "مطر", c: "rain", w: 3 }, { k: "rain", c: "rain", w: 3 },
  { k: "ثلج", c: "snow", w: 3 }, { k: "ضباب", c: "fog", w: 3 }, { k: "fog", c: "fog", w: 3 }, { k: "ليل", c: "night", w: 2 }, { k: "night", c: "night", w: 2 },
  { k: "شروق", c: "sunrise", w: 3 }, { k: "استوديو", c: "studio", w: 2 }, { k: "volumetric", c: "volumetriclight", w: 3 },
  { k: "دخان", c: "smoke", w: 2 }, { k: "اضاءه", c: "dramaticlight", w: 1 }, { k: "lighting", c: "dramaticlight", w: 1 },
  // فنون
  { k: "الوان مائيه", c: "watercolor", w: 3 }, { k: "اكواريل", c: "watercolor", w: 3 }, { k: "watercolor", c: "watercolor", w: 3 },
  { k: "انمي", c: "anime", w: 3 }, { k: "anime", c: "anime", w: 3 }, { k: "مانجا", c: "manga", w: 3 }, { k: "manga", c: "manga", w: 3 },
  { k: "حبر", c: "ink", w: 3 }, { k: "رصاص", c: "pencil", w: 3 }, { k: "قصص مصوره", c: "comic", w: 3 }, { k: "comic", c: "comic", w: 3 },
  { k: "بكسل", c: "pixelart", w: 3 }, { k: "pixel", c: "pixelart", w: 3 }, { k: "low poly", c: "lowpoly", w: 3 }, { k: "lowpoly", c: "lowpoly", w: 3 },
  { k: "زجاج معشق", c: "stainedglass", w: 3 }, { k: "ورق مقصوص", c: "papercraft", w: 3 }, { k: "ريسوجراف", c: "risograph", w: 3 }, { k: "ريترو", c: "retro", w: 3 }, { k: "retro", c: "retro", w: 3 },
  { k: "فحم", c: "charcoal", w: 3 }, { k: "تصوير واقعي", c: "photorealistic", w: 2 }, { k: "كونسبت", c: "conceptart", w: 3 }, { k: "concept art", c: "conceptart", w: 3 },
  { k: "قصص اطفال", c: "storybook", w: 3 }, { k: "طين", c: "clay", w: 2 },
  // تصميم
  { k: "لوجو", c: "logo", w: 3 }, { k: "logo", c: "logo", w: 3 }, { k: "شعار", c: "logo", w: 3 },
  { k: "بوستر", c: "poster", w: 3 }, { k: "poster", c: "poster", w: 3 }, { k: "ملصق", c: "poster", w: 2 },
  { k: "غلاف", c: "cover", w: 3 }, { k: "cover", c: "cover", w: 3 }, { k: "غلاف البوم", c: "albumcover", w: 3 },
  { k: "تايبوجرافي", c: "typography", w: 3 }, { k: "typography", c: "typography", w: 3 }, { k: "خط عربي", c: "typography", w: 2 },
  { k: "بروشور", c: "brochure", w: 3 }, { k: "فلاير", c: "flyer", w: 3 }, { k: "ثامبنيل", c: "thumbnail", w: 3 }, { k: "thumbnail", c: "thumbnail", w: 3 }, { k: "مصغره", c: "thumbnail", w: 2 },
  { k: "كاروسيل", c: "carousel", w: 3 }, { k: "carousel", c: "carousel", w: 3 }, { k: "شرائح", c: "carousel", w: 2 },
  { k: "ايقونه", c: "icon", w: 3 }, { k: "icon", c: "icon", w: 3 }, { k: "ستيكر", c: "sticker", w: 3 }, { k: "sticker", c: "sticker", w: 3 },
  { k: "مودبورد", c: "moodboard", w: 3 }, { k: "moodboard", c: "moodboard", w: 3 }, { k: "لوحه الوان", c: "colorpalette", w: 3 },
  { k: "مجله", c: "magazine", w: 3 }, { k: "بانر", c: "banner", w: 2 }, { k: "هويه", c: "branding", w: 3 }, { k: "branding", c: "branding", w: 3 }, { k: "براند", c: "branding", w: 2 },
  // منتجات
  { k: "موكاب", c: "mockup", w: 3 }, { k: "mockup", c: "mockup", w: 3 },
  { k: "تغليف", c: "packaging", w: 3 }, { k: "packaging", c: "packaging", w: 3 }, { k: "عبوه", c: "packaging", w: 3 },
  { k: "اعلان", c: "advertisement", w: 3 }, { k: "advertisement", c: "advertisement", w: 3 }, { k: "حملات", c: "commercial", w: 2 },
  { k: "كتالوج", c: "catalog", w: 3 }, { k: "فاترين", c: "ecommerce", w: 3 }, { k: "ecommerce", c: "ecommerce", w: 3 }, { k: "تسويق", c: "ecommerce", w: 2 },
  { k: "فاخر", c: "luxuryproduct", w: 3 }, { k: "بيلبورد", c: "billboard", w: 3 }, { k: "billboard", c: "billboard", w: 3 },
  { k: "تيشيرت", c: "tshirt", w: 3 }, { k: "كارت شخصي", c: "businesscard", w: 3 }, { k: "هيرو", c: "heroimage", w: 2 },
  // تحرير
  { k: "ارفع جوده", c: "upscale", w: 3 }, { k: "جوده اعلي", c: "upscale", w: 3 }, { k: "دقه اعلي", c: "upscale", w: 3 }, { k: "upscale", c: "upscale", w: 3 },
  { k: "حذف الخلفيه", c: "removebg", w: 3 }, { k: "شيل الخلفيه", c: "removebg", w: 3 }, { k: "remove background", c: "removebg", w: 3 },
  { k: "غير الخلفيه", c: "backgroundswap", w: 3 }, { k: "بدل الخلفيه", c: "backgroundswap", w: 3 }, { k: "استبدال الخلفيه", c: "backgroundswap", w: 3 }, { k: "background", c: "backgroundswap", w: 1 },
  { k: "احذف", c: "remove", w: 2 }, { k: "حذف", c: "remove", w: 2 }, { k: "شيل", c: "remove", w: 2 }, { k: "remove", c: "remove", w: 2 },
  { k: "رمم", c: "restore", w: 3 }, { k: "ترميم", c: "restore", w: 3 }, { k: "restore", c: "restore", w: 3 }, { k: "صوره قديمه", c: "restoreoldphoto", w: 3 }, { k: "old photo", c: "restoreoldphoto", w: 3 },
  { k: "تلوين", c: "colorize", w: 3 }, { k: "colorize", c: "colorize", w: 3 }, { k: "حسن", c: "enhance", w: 2 }, { k: "enhance", c: "enhance", w: 2 },
  { k: "عزل", c: "isolate", w: 3 }, { k: "قص", c: "isolate", w: 2 }, { k: "isolate", c: "isolate", w: 3 }, { k: "cutout", c: "isolate", w: 3 },
  { k: "ترجم", c: "translate", w: 3 }, { k: "اعاده اضاءه", c: "relight", w: 3 }, { k: "relight", c: "relight", w: 3 },
  { k: "غير الالوان", c: "recolor", w: 3 }, { k: "recolor", c: "recolor", w: 3 }, { k: "وسع الكادر", c: "outpaint", w: 3 }, { k: "outpaint", c: "outpaint", w: 3 },
  { k: "تدرج لوني", c: "colorgrade", w: 3 }, { k: "color grade", c: "colorgrade", w: 3 },
  // اتساق
  { k: "نفس الشخصيه", c: "characterconsistency", w: 3 }, { k: "شخصيه ثابته", c: "characterconsistency", w: 3 }, { k: "اتساق", c: "characterconsistency", w: 2 }, { k: "consistent character", c: "characterconsistency", w: 3 }, { k: "consistency", c: "characterconsistency", w: 2 },
  { k: "نفس الاسلوب", c: "styleconsistency", w: 3 }, { k: "دوران الشخصيه", c: "characterturnaround", w: 3 }, { k: "turnaround", c: "characterturnaround", w: 3 },
  { k: "مرجع", c: "referencebased", w: 2 }, { k: "reference", c: "referencebased", w: 2 }, { k: "model sheet", c: "modelsheet", w: 3 },
  // مفاهيمي
  { k: "استعاره", c: "metaphor", w: 3 }, { k: "مجاز", c: "metaphor", w: 2 }, { k: "مفهوم", c: "conceptualize", w: 2 }, { k: "concept", c: "conceptualize", w: 2 },
  { k: "قبل وبعد", c: "beforeafter", w: 3 }, { k: "قبل و بعد", c: "beforeafter", w: 3 }, { k: "before after", c: "beforeafter", w: 3 }, { k: "before/after", c: "beforeafter", w: 3 },
  { k: "مستقبل", c: "future", w: 2 }, { k: "future", c: "future", w: 2 }, { k: "تطور", c: "evolution", w: 2 }, { k: "رمزي", c: "symbolic", w: 2 },
  // سوشيال
  { k: "ريلز", c: "ugc", w: 2 }, { k: "تيك توك", c: "ugc", w: 2 }, { k: "ugc", c: "ugc", w: 3 }, { k: "سوشيال", c: "socialvisual", w: 3 }, { k: "social", c: "socialvisual", w: 2 },
  { k: "ستوري", c: "socialvisual", w: 1 }, { k: "b-roll", c: "broll", w: 3 }, { k: "ملاحظات", c: "stickynotes", w: 2 },
  // تعليم
  { k: "اشرح", c: "eli5", w: 2 }, { k: "explain", c: "eli5", w: 2 }, { k: "ببساطه", c: "simplify", w: 2 }, { k: "simplify", c: "simplify", w: 2 },
  { k: "علمني", c: "teachme", w: 3 }, { k: "cheat sheet", c: "cheatsheet", w: 3 }, { k: "ملخص", c: "cheatsheet", w: 2 },
  { k: "فلاش كارد", c: "flashcards", w: 3 }, { k: "flashcards", c: "flashcards", w: 3 }, { k: "بطاقات", c: "flashcards", w: 2 },
  { k: "تشبيه", c: "analogy", w: 3 }, { k: "analogy", c: "analogy", w: 3 }, { k: "كويز", c: "quiz", w: 3 },
  // أعمال
  { k: "swot", c: "swot", w: 3 }, { k: "سوات", c: "swot", w: 3 }, { k: "خارطه طريق", c: "roadmap", w: 3 }, { k: "roadmap", c: "roadmap", w: 3 },
  { k: "استراتيجيه", c: "strategy", w: 3 }, { k: "strategy", c: "strategy", w: 3 }, { k: "نموذج عمل", c: "businessmodel", w: 3 }, { k: "business model", c: "businessmodel", w: 3 },
  { k: "pitch", c: "pitch", w: 3 }, { k: "عرض استثماري", c: "pitch", w: 3 }, { k: "قرار", c: "decisionmatrix", w: 2 }, { k: "benchmark", c: "benchmark", w: 3 },
];

const NUM_WORDS: [string, number][] = [
  ["واحده", 1], ["واحد", 1], ["اتنين", 2], ["اثنين", 2], ["اثنتين", 2], ["ثلاث", 3], ["اربع", 4], ["خمس", 5],
  ["سته", 6], ["سبع", 7], ["ثمان", 8], ["تسع", 9], ["عشر", 10], ["عشره", 10], ["اثني عشر", 12], ["ست", 6],
];
const AR_NUMS: Record<string, number> = { "٠": 0, "١": 1, "٢": 2, "٣": 3, "٤": 4, "٥": 5, "٦": 6, "٧": 7, "٨": 8, "٩": 9 };

const SUBJECT_MAP: [string, string][] = [
  ["محرك", "a combustion engine"], ["سياره", "a car"], ["سفينه", "a ship"], ["طائره", "an aircraft"], ["توربين", "a turbine"],
  ["قلب", "a human heart"], ["دماغ", "a human brain"], ["دماغ", "a human brain"], ["عين", "a human eye"], ["رئه", "human lungs"], ["هيكل عظمي", "a human skeleton"],
  ["فيلا", "a modern villa"], ["مبني", "a building"], ["مسجد", "a mosque"], ["ناطحه", "a skyscraper"], ["كوبري", "a bridge"], ["جسر", "a bridge"],
  ["منتج", "a commercial product"], ["ساعه", "a luxury watch"], ["عطر", "a perfume bottle"], ["زجاجه", "a bottle"], ["هاتف", "a smartphone"], ["لابتوب", "a laptop"], ["قهوه", "a coffee brand product"],
  ["قمر", "the Moon"], ["مجموعه شمسيه", "the solar system"], ["كوكب", "a planet"], ["مجره", "a galaxy"], ["ذره", "an atom"], ["دي ان ايه", "a DNA helix"],
  ["مدينه", "a city"], ["شارع", "an old-city street"], ["سوق", "a market"],
  ["اسد", "a lion"], ["حصان", "a horse"], ["نسر", "an eagle"], ["قط", "a cat"],
  ["ورده", "a rose"], ["شجره", "a tree"], ["جبل", "a mountain"], ["صحراء", "a desert landscape"], ["بحر", "a seascape"],
  ["روبوت", "a robot"], ["ذكاء اصطناعي", "artificial intelligence"], ["انترنت", "the internet"], ["عمله رقميه", "a cryptocurrency"], ["طاقه", "energy systems"],
  ["ماء", "water"], ["شمس", "the Sun"], ["بترول", "oil refining"], ["مصنع", "a factory"], ["شبكه كهرباء", "a power grid"],
  ["دوره", "a lifecycle"], ["عمليه", "a process"], ["تطبيق", "a mobile app"], ["موقع", "a website"], ["منصه", "a platform"],
  ["براند", "a brand"], ["شركه ناشئه", "a startup"], ["فريق", "a team"], ["مشروع", "a project"],
];

export interface FeatureFlags {
  text: boolean; arabicText: boolean; photo: boolean; edit: boolean; multi: boolean; consistency: boolean;
  count: number | null; countNote: Bi; ratio: string | null; ratioNote: Bi;
}
export interface PickedCommand { cmd: CommandDef; catId: string; catTitle: string; catEn: string; explicit: boolean; }
export interface ModelScore { modelId: string; name: string; ar: string; hue: string; score: number; pct: number; reasons: Bi[]; st: string; stAr: string; }
export interface Analysis {
  summary: Bi; subjectAr: string; subjectEn: string;
  cats: { id: string; title: string; en: string; score: number }[];
  commands: PickedCommand[]; models: ModelScore[];
  features: FeatureFlags; userText: string; stackLine: string;
}

/* ================= التحليل ================= */
export function analyze(raw: string): Analysis | null {
  const text = raw.toLowerCase();
  const norm = normalize(text);
  const tokens = new Set(norm.split(/[^a-z0-9]+/).filter(Boolean));

  // الأوامر الصريحة /name
  const explicit = new Set<string>();
  for (const m of text.matchAll(/\/([a-z0-9]+)/g)) {
    const name = m[1];
    if (COMMAND_INDEX.has(name)) explicit.add(name);
    else if (RELATED[name]) explicit.add(RELATED[name]);
  }

  // درجات الأوامر
  const cmdScore = new Map<string, number>();
  for (const n of explicit) cmdScore.set(n, (cmdScore.get(n) ?? 0) + 4);
  for (const rule of RULES) {
    if (matchKeyword(norm, tokens, normalize(rule.k))) {
      const target = explicit.has(rule.c) ? rule.c : rule.c;
      cmdScore.set(target, (cmdScore.get(target) ?? 0) + (rule.w ?? 2));
    }
  }

  // درجات الفئات (لغرض الترتيب فقط)
  const catScore = new Map<string, number>();
  for (const cat of CATEGORIES) {
    let s = 0;
    for (const k of cat.keywords) if (matchKeyword(norm, tokens, normalize(k))) s += 1;
    if (s > 0) catScore.set(cat.id, s);
  }

  const picked: PickedCommand[] = [];
  const usedCats = new Set<string>();
  const sorted = [...cmdScore.entries()].sort((a, b) => b[1] - a[1]);
  for (const [name] of sorted) {
    const hit = COMMAND_INDEX.get(name);
    if (!hit) continue;
    picked.push({ cmd: hit.cmd, catId: hit.cat.id, catTitle: hit.cat.title, catEn: hit.cat.en, explicit: explicit.has(name) });
    usedCats.add(hit.cat.id);
    if (picked.length >= 6) break;
  }
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
        if (hit) { picked.push({ cmd: hit.cmd, catId: hit.cat.id, catTitle: hit.cat.title, catEn: hit.cat.en, explicit: false }); usedCats.add(cid); }
      }
    }
  }

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

  const features: FeatureFlags = {
    text: /(نص|كتابه|كلمه|اسم|عباره|text|typography|حروف|caption|wording)/.test(norm),
    arabicText: /(خط عربي|عربي|بالعربيه|اسم عربي|arabic)/.test(norm),
    photo: /(واقعي|فوتو|تصوير|photo|realistic)/.test(norm) || usedCats.has("photo"),
    edit: usedCats.has("editing") || /(ارفق|صورتي|الصوره دي|هذه الصوره|عدل علي|edit this|attached)/.test(norm),
    multi: ["storyboard", "carousel", "360view", "multiview", "characterturnaround", "sceneplan", "shotlist", "flashcards", "thenvsnow"].some((n) => cmdScore.has(n)),
    consistency: usedCats.has("consistency"),
    count: null, countNote: { ar: "", en: "" }, ratio: null, ratioNote: { ar: "", en: "" },
  };

  const numStr = norm.replace(/[٠-٩]/g, (d) => String(AR_NUMS[d]));
  const mCount = numStr.match(/(\d+)\s*(صور|لقط|صفح|panels|slides|مشاهد|images|shots|frames)/);
  const asYouSpec = { ar: "كما حددت في طلبك", en: "as you specified" };
  if (mCount) { features.count = Math.min(24, parseInt(mCount[1], 10)); features.countNote = asYouSpec; }
  else {
    for (const [w, n] of NUM_WORDS) {
      if (norm.includes(w + " صور") || norm.includes(w + " لقط") || norm.includes(w + " image") || norm.includes(w + " shot")) {
        features.count = n; features.countNote = asYouSpec; break;
      }
    }
  }
  if (features.count === null) {
    if (cmdScore.has("storyboard") || cmdScore.has("sceneplan")) { features.count = 6; features.countNote = { ar: "افتراضي للستوري بورد (6 لقطات)", en: "storyboard default (6 frames)" }; }
    else if (cmdScore.has("carousel") || cmdScore.has("flashcards")) { features.count = 5; features.countNote = { ar: "افتراضي للكاروسيل (5 شرائح)", en: "carousel default (5 slides)" }; }
    else if (cmdScore.has("360view") || cmdScore.has("multiview") || cmdScore.has("characterturnaround")) { features.count = 4; features.countNote = { ar: "افتراضي للعرض متعدد الزوايا", en: "multi-angle default" }; }
    else { features.count = 1; features.countNote = { ar: "صورة واحدة مركزة", en: "single focused image" }; }
  }
  if (features.multi && features.count === 1) features.count = 4;

  const mRatio = numStr.match(/(\d{1,2})\s*[:x×]\s*(\d{1,2})/);
  if (mRatio) { features.ratio = `${mRatio[1]}:${mRatio[2]}`; features.ratioNote = asYouSpec; }
  else if (/(مربع|square)/.test(norm)) { features.ratio = "1:1"; features.ratioNote = { ar: "مربع", en: "square" }; }
  else if (/(ستوري|ريلز|تيك توك|طولي|vertical|reel)/.test(norm)) { features.ratio = "9:16"; features.ratioNote = { ar: "عمودي للسوشيال", en: "vertical for social" }; }
  else if (/(بانوراما|سينمائي|cinematic|panorama)/.test(norm) || cmdScore.has("panoramic") || cmdScore.has("cinematic")) { features.ratio = "21:9"; features.ratioNote = { ar: "سينمائي عريض", en: "cinematic wide" }; }
  else if (/(بوستر|غلاف|بروشور|poster|cover)/.test(norm) || cmdScore.has("poster") || cmdScore.has("cover")) { features.ratio = "2:3"; features.ratioNote = { ar: "طولي للمطبوعات", en: "portrait for print" }; }
  else if (cmdScore.has("floorplan") || cmdScore.has("siteplan")) { features.ratio = "4:3"; features.ratioNote = { ar: "مناسب للمساقط", en: "suited to plans" }; }
  else { features.ratio = "16:9"; features.ratioNote = { ar: "افتراضي واسع", en: "wide default" }; }

  /* تقييم النماذج */
  const modelScores = MODELS.map(() => 0);
  const reasons: Bi[][] = MODELS.map(() => []);
  const rate = (r: string, i: number) => parseInt(r[i], 10);
  for (const p of picked) {
    const w = p.explicit ? 2 : 1;
    for (let i = 0; i < 8; i++) modelScores[i] += rate(p.cmd.r, i) * w;
  }
  for (const cInfo of cats) {
    const cat = CATEGORIES.find((x) => x.id === cInfo.id)!;
    const tops = cat.top.map((tn) => COMMAND_INDEX.get(tn)).filter(Boolean);
    for (let i = 0; i < 8; i++) {
      const avg = tops.reduce((s, tn) => s + rate(tn!.cmd.r, i), 0) / Math.max(1, tops.length);
      modelScores[i] += avg * Math.min(3, cInfo.score) * 0.6;
    }
  }
  const boost = (idx: number, pts: number, arR: string, enR: string) => {
    modelScores[idx] += pts;
    if (pts >= 2) reasons[idx].push({ ar: arR, en: enR });
  };
  const I = (id: string) => MODELS.findIndex((m) => m.id === id);

  const MODEL_MENTIONS: [RegExp, string][] = [
    [/(gpt|chatgpt|dall)/, "gpt"], [/(gemini|nano banana|جيميناي)/, "gemini"], [/(qwen|كيون)/, "qwen"], [/(flux|فلوكس)/, "flux"],
    [/(midjourney|ميدجورني)/, "midjourney"], [/(firefly|فايرفلاي)/, "firefly"], [/(ideogram|ايديوجرام|ايديوغرام)/, "ideogram"],
    [/(sdxl|stable diffusion|ستيبل ديفيوجن)/, "sdxl"],
  ];
  for (const [re, id] of MODEL_MENTIONS) {
    if (re.test(norm)) boost(I(id), 9, "النموذج الذي فضّله المستخدم صراحة", "Model explicitly preferred by the user");
  }

  if (features.text && features.arabicText) {
    boost(I("qwen"), 5, "إتقان ممتاز للنصوص العربية داخل الصورة", "Excellent Arabic text rendering inside images");
    boost(I("gemini"), 5, "دقة عالية في توليد الحروف العربية", "High accuracy generating Arabic lettering");
    boost(I("gpt"), 3, "التزام قوي بتعليمات النص", "Strong instruction adherence for text");
  } else if (features.text) {
    boost(I("ideogram"), 5, "الأفضل عالميًا في التايبوجرافي داخل الصورة", "World-leading in-image typography");
    boost(I("gpt"), 3, "نصوص دقيقة داخل التكوين", "Accurate text within the composition");
    boost(I("qwen"), 2, "قدرات نصية قوية", "Strong text capabilities");
  }
  if (features.photo) {
    boost(I("flux"), 4, "واقعية تصويرية وخامات فائقة", "Superior photographic realism & textures");
    boost(I("gpt"), 3, "فوتورياليزم ملتزم بالتفاصيل", "Detail-faithful photorealism");
    boost(I("midjourney"), 2, "جماليات تصويرية خلابة", "Stunning photographic aesthetics");
  }
  if (features.edit) {
    boost(I("gemini"), 5, "تحرير مرجعي هو الأقوى حاليًا (Nano Banana)", "Currently the strongest reference-based editing (Nano Banana)");
    boost(I("gpt"), 4, "تحرير حواري متعدد الخطوات", "Multi-step conversational editing");
    boost(I("firefly"), 2, "أدوات Generative Fill موثوقة", "Reliable Generative Fill tooling");
  }
  if (features.consistency) {
    boost(I("gemini"), 4, "ثبات الهوية عبر سلسلة الصور", "Identity consistency across image series");
    boost(I("gpt"), 3, "ذاكرة مرجعية داخل المحادثة", "In-conversation reference memory");
  }
  if (features.multi) {
    boost(I("gpt"), 3, "توليد لوحات متعددة الصور باتساق", "Consistent multi-image sheet generation");
    boost(I("gemini"), 3, "دمج مراجع متعددة في مخرجات متسقة", "Merges multiple references into consistent outputs");
  }
  if (usedCats.has("design")) boost(I("ideogram"), 3, "شعارات وهويات بجودة تصميمية", "Design-grade logos & identities");
  if (usedCats.has("design") || usedCats.has("product")) boost(I("firefly"), 2, "آمن تجاريًا للاستخدام التسويقي", "Commercially safe for marketing use");
  if (usedCats.has("art")) { boost(I("midjourney"), 3, "حس فني وأسلوبي متفوق", "Superior artistic & stylistic sensibility"); boost(I("flux"), 2, "تنوع أسلوبي نقي", "Clean stylistic range"); }
  if (usedCats.has("cinematic")) { boost(I("midjourney"), 3, "كادرات سينمائية مرجعية", "Reference-grade cinematic framing"); boost(I("flux"), 2, "إضاءة فيلمية واقعية", "Realistic filmic lighting"); }
  if (usedCats.has("engineering") || usedCats.has("architecture")) {
    boost(I("gpt"), 3, "دقة تقنية في المخططات والقطاعات", "Technical accuracy in drawings & sections");
    boost(I("gemini"), 2, "التزام هندسي بالتعليمات", "Engineering-grade instruction adherence");
    boost(I("sdxl"), 1, "قابل للضبط عبر ControlNet", "Tunable via ControlNet");
  }
  if (usedCats.has("medical")) boost(I("gpt"), 2, "ضبط علمي يقلل الهلوسة التشريحية", "Scientific grounding reduces anatomical hallucination");

  const maxScore = Math.max(...modelScores);
  const winnerIdx = modelScores.indexOf(maxScore);
  if (reasons[winnerIdx].length === 0) {
    reasons[winnerIdx].push({ ar: "توازن عام قوي عبر الفئات المطلوبة", en: "Strong overall balance across the requested domains" });
  }
  const order = MODELS.map((_, i) => i).sort((a, b) => modelScores[b] - modelScores[a]).slice(0, 3);
  const models: ModelScore[] = order.map((i) => ({
    modelId: MODELS[i].id, name: MODELS[i].name, ar: MODELS[i].ar, hue: MODELS[i].hue, st: MODELS[i].st, stAr: MODELS[i].stAr,
    score: Math.round(modelScores[i] * 10) / 10,
    pct: Math.max(38, Math.round((modelScores[i] / maxScore) * 100)),
    reasons: reasons[i].slice(0, 2),
  }));

  /* الموضوع */
  const subjHits: string[] = [];
  const subjEn: string[] = [];
  for (const [sar, sen] of SUBJECT_MAP) {
    if (norm.includes(sar) && !subjEn.includes(sen)) { subjHits.push(sar); subjEn.push(sen); if (subjEn.length >= 2) break; }
  }
  const subjectAr = subjHits.length ? subjHits.join(" + ") : "";
  const subjectEn = subjEn.length ? subjEn.join(" combined with ") : "";

  const stackLine = picked.map((p) => "/" + p.cmd.name).join(" + ");
  const catNames = cats.map((c) => c.title).join("، ");
  const catNamesEn = cats.map((c) => c.en).join(" + ");
  const notes: Bi[] = [];
  if (features.text) notes.push(features.arabicText
    ? { ar: "نص عربي داخل الصورة", en: "Arabic text inside the image" }
    : { ar: "نص/تايبوجرافي داخل الصورة", en: "Text/typography inside the image" });
  if (features.edit) notes.push({ ar: "تعديل على صورة قائمة", en: "Editing an existing image" });
  if (features.consistency) notes.push({ ar: "ثبات هوية عبر الصور", en: "Identity consistency across images" });
  if (features.multi) notes.push({ ar: "مخرجات متعددة الصور", en: "Multi-image outputs" });
  if (features.photo) notes.push({ ar: "طابع واقعي", en: "Realistic look" });

  const summary: Bi = {
    ar:
      `راجعت طلبك بدقة: ` +
      (subjectAr ? `الموضوع الأساسي «${subjectAr}» ضمن ` : ``) +
      `مجال ${catNames}. ` +
      (explicit.size ? `التقطت ${explicit.size} أمرًا صريحًا ذكرته، و` : ``) +
      `رشحت ${picked.length} أوامر بصرية من القاموس. ` +
      (notes.length ? `ملاحظات مؤثرة على اختيار النموذج: ${notes.map((n) => n.ar).join("، ")}.` : `لا قيود خاصة مكتشفة — الاختيار حسب جودة الفئة.`),
    en:
      `I reviewed your request carefully: ` +
      (subjectEn ? `the core subject is ${subjectEn}, within ` : ``) +
      `${catNamesEn}. ` +
      (explicit.size ? `I detected ${explicit.size} explicit command(s) you mentioned and ` : ``) +
      `shortlisted ${picked.length} visual commands from the dictionary. ` +
      (notes.length ? `Model-selection drivers: ${notes.map((n) => n.en).join(", ")}.` : `No special constraints detected — selection is based on domain quality.`),
  };

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
  multiview: { ar: "مخرج عروض منتج ثلاثية الأبعاد بخبرة استوديوهات Pixar الصناعية", en: "a world-class 3D presentation director (Pixar-grade industrial showcases)" },
  engineering: { ar: "مهندس تصوير تقني يجمع بين دقة CAD وجماليات المخططات الكلاسيكية", en: "a precision technical-illustration engineer blending CAD accuracy with classic drafting aesthetics" },
  architecture: { ar: "معماري بصري بمدرسة ArchDaily: مساقط نظيفة وتقديم فراغي مقنع", en: "an award-winning architectural visualizer (ArchDaily school): clean drawings, convincing spatial presentation" },
  medical: { ar: "رسام طبي علمي بمستوى دوريات Nature — دقة تشريحية بلا مبالغة", en: "a scientific medical illustrator (Nature-grade anatomical accuracy, zero exaggeration)" },
  diagram: { ar: "مصمم معلومات (Information Designer) يحوّل التعقيد إلى وضوح بصري فوري", en: "an expert information designer who turns complexity into instant visual clarity" },
  photo: { ar: "مصور محترف بخبرة 20 عامًا في الإضاءة والتكوين", en: "a professional photographer with 20 years of lighting and composition experience" },
  cinematic: { ar: "مدير تصوير سينمائي (DP) بأسلوب مدارس A24 وVilleneuve", en: "a cinematic director of photography (A24 / Villeneuve school)" },
  lighting: { ar: "فنان إضاءة وأجواء يتحكم بالضوء كأداة سرد", en: "a lighting & atmosphere artist who wields light as a storytelling tool" },
  art: { ar: "فنان بصري متعدد الأساليب يتقن الوسيط المطلوب حرفيًا", en: "a master visual artist fluent in the requested medium" },
  design: { ar: "مدير فني للهويات البصرية بخبرة استوديوهات Pentagram", en: "a brand-identity art director (Pentagram-caliber studios)" },
  product: { ar: "مصور إعلانات تجارية للمنتجات الفاخرة", en: "a high-end commercial product photographer" },
  editing: { ar: "خبير ريتوش وتحرير توليدي يدمج AI بأدوات الاستوديو", en: "a generative retouch & compositing specialist merging AI with studio tooling" },
  consistency: { ar: "مشرف اتساق بصري لسلاسل الصور والشخصيات", en: "a visual continuity supervisor for image series & characters" },
  conceptual: { ar: "مفكر بصري يترجم المجرد إلى استعارات مفهومة فورًا", en: "a conceptual visual thinker translating abstraction into instantly readable metaphors" },
  social: { ar: "صانع محتوى بصري يفهم خوارزميات المنصات ولغة UGC", en: "a platform-native social content designer fluent in algorithms and UGC language" },
  learning: { ar: "معلم بصري يبسّط أعقد الأفكار دون تفريط في الدقة", en: "a visual educator who simplifies the hardest ideas without losing accuracy" },
  business: { ar: "مستشار استراتيجي يحوّل البيانات إلى قرارات بصرية", en: "a strategy consultant & data storyteller" },
};

export interface PromptSection { h: Bi; body: Bi; }
export interface BuiltPrompt {
  title: Bi;
  meta: { model: string; stack: string; count: number; ratio: Bi; halluc: Bi; hallucPct: number };
  sections: PromptSection[];
  paste: string;
}

export function buildPrompt(a: Analysis): BuiltPrompt {
  const topCat = a.cats[0]?.id ?? "design";
  const persona = PERSONA[topCat] ?? PERSONA.design;
  const top = a.models[0];
  const altModels = a.models.slice(1).map((m) => m.name).join(" · ");
  const topReason = top.reasons[0] ?? { ar: top.stAr, en: top.st };

  let halluc: Bi; let hallucPct: number;
  if (["engineering", "medical", "architecture", "diagram"].includes(topCat) || a.features.text) {
    halluc = { ar: "صارم: ≤ 5%", en: "Strict: ≤ 5%" }; hallucPct = 5;
  } else if (["photo", "cinematic", "product", "editing"].includes(topCat)) {
    halluc = { ar: "منخفض: ≤ 10%", en: "Low: ≤ 10%" }; hallucPct = 10;
  } else {
    halluc = { ar: "إبداعي متحكم به: 15–20%", en: "Controlled creative: 15–20%" }; hallucPct = 18;
  }

  const count = a.features.count ?? 1;
  const ratio = a.features.ratio ?? "16:9";
  const subjectEn = a.subjectEn || "the exact subject described in the client brief";
  const ops = a.commands.map((p) => p.cmd.name).join(" + ");

  const cmdAr = a.commands.map((p, i) => `${i + 1}. /${p.cmd.name} — ${p.cmd.fn} ← النتيجة: تطبيق هذه العملية البصرية على الموضوع مع الحفاظ على الاتساق بين كل المخرجات.`).join("\n");
  const cmdEn = a.commands.map((p, i) => `${i + 1}. /${p.cmd.name} — ${p.cmd.en} ← Effect: apply this visual operation to the subject while keeping consistency across all outputs.`).join("\n");

  const neg = buildNegative(a);

  const sections: PromptSection[] = [
    {
      h: { ar: "النموذج الموصى به", en: "Recommended model" },
      body: {
        ar: `ابدأ التنفيذ على: ${top.name} (${top.ar}) — ملاءمة ${top.pct}%.\nسبب الاختيار: ${topReason.ar}.\nبدائل قوية إن لم يتوفر: ${altModels}.`,
        en: `Run this on: ${top.name} — ${top.pct}% fit.\nWhy: ${topReason.en}.\nStrong fallbacks if unavailable: ${altModels}.`,
      },
    },
    {
      h: { ar: "الشخصية (Persona)", en: "Persona" },
      body: {
        ar: `يتقمص النموذج دور: ${persona.ar}.\nأنت تنفذ موجزًا بصريًا دقيقًا — لا ترتجل.`,
        en: `You are ${persona.en}, executing a precise visual brief — not improvising.`,
      },
    },
    {
      h: { ar: "المطلوب (Task)", en: "Task" },
      body: {
        ar: `تنفيذ ${count > 1 ? `سلسلة من ${count} صور مترابطة` : "صورة واحدة"} لـ${a.subjectAr ? `«${a.subjectAr}»` : "الموضوع الموصوف في الطلب"} ضمن مجال: ${a.cats.map((c) => c.title).join(" + ")}.\nكل التفاصيل التالية إلزامية وليست اقتراحات.`,
        en: `Produce ${count > 1 ? `a coherent series of ${count} images` : "one image"} of ${subjectEn}.\nDomain: ${a.cats.map((c) => c.en).join(" + ")}.\nEvery detail below is mandatory, not suggestive.`,
      },
    },
    {
      h: { ar: "مجموعة الأوامر (Command Stack)", en: "Command stack" },
      body: {
        ar: `التركيبة: ${a.stackLine}\n\n${cmdAr}`,
        en: `Stack: ${a.stackLine}\n\n${cmdEn}`,
      },
    },
    {
      h: { ar: "المخرجات النهائية المحددة", en: "Exact final outputs" },
      body: {
        ar: `• العدد: ${count} ${count > 1 ? "صور" : "صورة"} — ${a.features.countNote.ar}\n• الأبعاد: ${ratio} (${a.features.ratioNote.ar})\n• الدقة: 4K (3840×2160) أو أعلى، تفاصيل حادة، بلا artifacts\n• الصيغة: PNG/JPG عالية الجودة${a.features.consistency ? "\n• الاتساق: هوية بصرية واحدة (وجه/منتج/ألوان) ثابتة عبر كل الصور" : ""}`,
        en: `• Count: ${count} image${count > 1 ? "s" : ""} — ${a.features.countNote.en}\n• Aspect ratio: ${ratio} (${a.features.ratioNote.en})\n• Resolution: 4K (3840×2160) or higher, crisp detail, zero artifacts\n• Format: high-quality PNG/JPG${a.features.consistency ? "\n• Consistency: one visual identity (face/product/colors) held constant across all images" : ""}`,
      },
    },
    {
      h: { ar: "ضبط الهلوسة (Hallucination Guardrails)", en: "Hallucination guardrails" },
      body: {
        ar: `السقف المحدد: ${halluc.ar}\n• لا تضف عناصر غير مذكورة في البرومبت.\n${a.features.text ? "• النص المكتوب حرفيًا فقط — بلا حروف زائدة أو أخطاء إملائية.\n" : "• لا تكتب أي نص أو أرقام داخل الصورة إلا إذا طُلب صراحة.\n"}• دقة فيزيائية/تشريحية/هندسية: نسب صحيحة، اتصالات ميكانيكية منطقية.\n• Negative prompt: ${neg}`,
        en: `Ceiling: ${halluc.en}\n• Add nothing that is not mentioned in this prompt.\n${a.features.text ? "• Render text exactly as specified — no extra letters, no typos.\n" : "• Render no text or numerals inside the image unless explicitly requested.\n"}• Physical/anatomical/engineering accuracy: correct proportions, logical mechanical connections.\n• Negative prompt: ${neg}`,
      },
    },
  ];

  const enBits: string[] = [];
  enBits.push(`[RECOMMENDED ENGINE: ${top.name} | Fit ${top.pct}% | Fallbacks: ${altModels}]`);
  enBits.push(`You are ${persona.en}.`);
  enBits.push(`Create ${count > 1 ? `${count} coherent images` : "one image"} of ${subjectEn}.`);
  enBits.push(`Apply this visual operation stack in order: ${ops}.`);
  if (a.commands.some((p) => ["lighting", "art", "photo", "cinematic"].includes(p.catId)))
    enBits.push(a.commands.filter((p) => ["lighting", "art", "photo", "cinematic"].includes(p.catId)).map((p) => p.cmd.en).join(", ") + ".");
  enBits.push(`Aspect ratio ${ratio}, 4K+, ultra-detailed, professional-grade, physically accurate, coherent composition.`);
  if (a.features.text) enBits.push(`Render text exactly as specified in the brief — typographically flawless.`);
  else enBits.push(`No text or numerals inside the image unless explicitly requested.`);
  enBits.push(`Strictly avoid: ${neg}.`);
  enBits.push(`Client brief: "${a.userText}"`);

  return {
    title: a.subjectAr ? { ar: `برومبت «${a.subjectAr}»`, en: `Prompt: ${a.subjectEn}` } : { ar: "البرومبت النهائي", en: "Final prompt" },
    meta: { model: top.name, stack: a.stackLine, count, ratio: { ar: ratio, en: ratio }, halluc, hallucPct },
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
export const SUGGESTIONS: { label: Bi; text: Bi }[] = [
  { label: { ar: "انفوجرافيك أيزومتري", en: "Isometric infographic" }, text: { ar: "اعمل انفوجرافيك يشرح دورة الماء في الطبيعة بأسلوب ايزومتري مع ألوان هادئة", en: "Create an infographic explaining the water cycle in an isometric style with calm colors" } },
  { label: { ar: "تفكيك هندسي", en: "Engineering teardown" }, text: { ar: "أحتاج exploded view لمحرك سيارة بأسلوب blueprint مع أبعاد وقياسات", en: "I need an exploded view of a car engine in blueprint style with dimensions and measurements" } },
  { label: { ar: "لوجو بخط عربي", en: "Arabic-calligraphy logo" }, text: { ar: "صمم لوجو لبراند قهوة اسمه «مَدى» مع تايبوجرافي عربي راقٍ", en: "Design a logo for a coffee brand named «Mada» with refined Arabic typography" } },
  { label: { ar: "بورتريه سينمائي", en: "Cinematic portrait" }, text: { ar: "بورتريه سينمائي لامرأة تحت المطر بإضاءة نيون وعمق ميدان ضحل", en: "Cinematic portrait of a woman in the rain with neon lighting and shallow depth of field" } },
  { label: { ar: "مخطط معماري", en: "Architectural plan" }, text: { ar: "مخطط أرضي لفيلا مودرن مع مقطع معماري يوضح الفراغات", en: "A floor plan of a modern villa with an architectural section revealing the spaces" } },
  { label: { ar: "ستوري بورد", en: "Storyboard" }, text: { ar: "ستوري بورد سينمائي من 6 لقطات لمشهد مطاردة في أزقة قديمة وقت الغروب", en: "A 6-frame cinematic storyboard for a chase scene through old alleys at golden hour" } },
  { label: { ar: "ترميم صورة", en: "Photo restoration" }, text: { ar: "أريد ترميم وتلوين صورة عائلية قديمة مع تحسين الدقة", en: "Restore and colorize an old family photo with resolution enhancement" } },
];

export const DECLINE_CHIPS: Bi[] = [
  { ar: "نفّذها بأسلوب أنمي ياباني", en: "Make it Japanese anime style" },
  { ar: "اجعلها 4 صور مربعة 1:1", en: "Make it 4 square 1:1 images" },
  { ar: "أضف إضاءة غروب ذهبية", en: "Add golden-hour lighting" },
  { ar: "أريدها بدون أي نصوص داخل الصورة", en: "No text inside the image" },
  { ar: "بدّل النموذج الأنسب إلى Midjourney", en: "Switch the model to Midjourney" },
];

export { ALL_COMMANDS, MACROS, CORE64, CATEGORIES, MODELS };
