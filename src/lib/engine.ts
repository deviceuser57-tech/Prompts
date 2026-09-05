import {
  CATEGORIES, COMMAND_INDEX, ALL_COMMANDS, MODELS, TASK_ENGINES, enginesFor, RELATED, MACROS, CORE64,
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
  /* ---------- بصري: منظورات ---------- */
  { k: "360", c: "360view", w: 3 }, { k: "ايزومتري", c: "isometric", w: 3 }, { k: "isometric", c: "isometric", w: 3 },
  { k: "زوايا", c: "multiview", w: 2 }, { k: "زاويه", c: "multiview" }, { k: "منظور", c: "perspective" },
  { k: "علوي", c: "topdown" }, { k: "جوي", c: "aerial", w: 3 }, { k: "درون", c: "aerial", w: 3 }, { k: "drone", c: "aerial", w: 3 }, { k: "aerial", c: "aerial", w: 3 },
  { k: "بانوراما", c: "panoramic" }, { k: "panorama", c: "panoramic" }, { k: "panoramic", c: "panoramic" },
  { k: "close-up", c: "closeup", w: 2 }, { k: "closeup", c: "closeup", w: 2 }, { k: "لقطه قريبه", c: "closeup", w: 2 },
  { k: "عين الطائر", c: "birdseye", w: 3 }, { k: "birdseye", c: "birdseye", w: 3 },
  /* ---------- بصري: هندسة ---------- */
  { k: "تفكيك", c: "explodedview", w: 3 }, { k: "exploded", c: "explodedview", w: 3 },
  { k: "مقطع", c: "cutaway", w: 3 }, { k: "قطاع", c: "crosssection", w: 2 }, { k: "cutaway", c: "cutaway", w: 3 },
  { k: "blueprint", c: "blueprint", w: 3 }, { k: "مخطط ازرق", c: "blueprint", w: 3 },
  { k: "ابعاد", c: "dimensioned", w: 3 }, { k: "قياسات", c: "dimensioned", w: 3 }, { k: "dimensions", c: "dimensioned", w: 3 },
  { k: "xray", c: "xray", w: 3 }, { k: "x-ray", c: "xray", w: 3 }, { k: "اشعه", c: "xray", w: 2 },
  { k: "wireframe", c: "wireframe", w: 3 }, { k: "wire", c: "wireframe" },
  { k: "شفاف", c: "transparent", w: 2 }, { k: "تروس", c: "mechanism", w: 3 }, { k: "ميكانيك", c: "mechanism", w: 3 }, { k: "mechanical", c: "mechanism", w: 3 },
  { k: "محرك", c: "mechanism", w: 2 }, { k: "تجميع", c: "assembly", w: 2 }, { k: "cad", c: "cad", w: 3 },
  /* ---------- بصري: عمارة ---------- */
  { k: "مخطط ارضي", c: "floorplan", w: 3 }, { k: "floorplan", c: "floorplan", w: 3 }, { k: "floor plan", c: "floorplan", w: 3 }, { k: "مسقط", c: "floorplan", w: 3 },
  { k: "واجهه", c: "facade", w: 3 }, { k: "facade", c: "facade", w: 3 },
  { k: "داخلي", c: "interior", w: 3 }, { k: "ديكور", c: "interior", w: 3 }, { k: "interior", c: "interior", w: 3 },
  { k: "فيلا", c: "floorplan", w: 2 }, { k: "villa", c: "floorplan", w: 2 }, { k: "مبني", c: "elevation", w: 2 }, { k: "عمراني", c: "urbanplan", w: 3 },
  { k: "حديقه", c: "landscape", w: 2 }, { k: "موقع عام", c: "siteplan", w: 3 }, { k: "كتل", c: "massing", w: 2 },
  /* ---------- بصري: طبي ---------- */
  { k: "تشريح", c: "anatomy", w: 3 }, { k: "anatomy", c: "anatomy", w: 3 }, { k: "قلب", c: "organ", w: 2 }, { k: "heart", c: "organ", w: 2 }, { k: "عضو", c: "organ", w: 2 },
  { k: "خليه", c: "cellular", w: 3 }, { k: "خلايا", c: "cellular", w: 3 }, { k: "مجهر", c: "microscopic", w: 3 },
  { k: "microscopic", c: "microscopic", w: 3 }, { k: "دماغ", c: "neural", w: 3 }, { k: "مخ", c: "neural", w: 2 }, { k: "brain", c: "neural", w: 3 },
  { k: "اعصاب", c: "neural", w: 3 }, { k: "جزيء", c: "molecular", w: 3 }, { k: "dna", c: "molecular", w: 3 },
  { k: "جراح", c: "surgical", w: 3 }, { k: "mri", c: "mri", w: 3 }, { k: "طبي", c: "medical", w: 2 }, { k: "medical", c: "medical", w: 2 },
  /* ---------- بصري: مخططات ---------- */
  { k: "انفوجرافيك", c: "infographic", w: 3 }, { k: "infographic", c: "infographic", w: 3 },
  { k: "خريطه ذهنيه", c: "mindmap", w: 3 }, { k: "mindmap", c: "mindmap", w: 3 }, { k: "mind map", c: "mindmap", w: 3 },
  { k: "تدفق", c: "flowchart", w: 3 }, { k: "flowchart", c: "flowchart", w: 3 },
  { k: "مقارن", c: "comparison", w: 3 }, { k: "خط زمني", c: "timeline", w: 3 }, { k: "timeline", c: "timeline", w: 3 },
  { k: "رسم توضيحي", c: "diagram", w: 2 }, { k: "diagram", c: "diagram", w: 2 },
  { k: "شبكه", c: "network", w: 2 }, { k: "نظام بيئي", c: "ecosystem", w: 3 }, { k: "دوره", c: "cycle", w: 2 }, { k: "water cycle", c: "cycle", w: 3 },
  { k: "مراحل", c: "process", w: 2 }, { k: "عمليه", c: "process", w: 2 }, { k: "هرم", c: "hierarchy", w: 2 },
  { k: "شجره قرار", c: "decisiontree", w: 3 }, { k: "داشبورد", c: "dashboard", w: 3 }, { k: "dashboard", c: "dashboard", w: 3 },
  { k: "خريطه", c: "map", w: 2 }, { k: "رحله", c: "journey", w: 2 }, { k: "حراريه", c: "heatmap", w: 3 }, { k: "heatmap", c: "heatmap", w: 3 },
  /* ---------- بصري: تصوير ---------- */
  { k: "بورتريه", c: "portrait", w: 3 }, { k: "portrait", c: "portrait", w: 3 },
  { k: "تصوير منتج", c: "productshot", w: 3 }, { k: "product", c: "productshot", w: 2 }, { k: "طعام", c: "foodphoto", w: 3 }, { k: "شارع", c: "streetphoto", w: 2 }, { k: "street", c: "streetphoto", w: 2 },
  { k: "وثائقي", c: "documentary", w: 2 }, { k: "ازياء", c: "fashion", w: 3 }, { k: "موضه", c: "fashion", w: 2 }, { k: "fashion", c: "fashion", w: 3 },
  { k: "واقعي", c: "photorealistic", w: 3 }, { k: "photoreal", c: "photorealistic", w: 3 }, { k: "realistic", c: "photorealistic", w: 3 },
  { k: "topdown", c: "topdown", w: 3 }, { k: "flat-lay", c: "topdown", w: 2 }, { k: "flat lay", c: "topdown", w: 2 }, { k: "longexposure", c: "longexposure", w: 3 },
  /* ---------- بصري: سينمائي ---------- */
  { k: "سينمائي", c: "cinematic", w: 3 }, { k: "cinematic", c: "cinematic", w: 3 },
  { k: "ستوري بورد", c: "storyboard", w: 3 }, { k: "storyboard", c: "storyboard", w: 3 },
  { k: "anamorphic", c: "anamorphic", w: 3 }, { k: "bokeh", c: "bokeh", w: 3 }, { k: "بوكيه", c: "bokeh", w: 3 },
  { k: "عمق الميدان", c: "shallowdof", w: 2 }, { k: "depth of field", c: "shallowdof", w: 2 }, { k: "فيلم", c: "filmstill", w: 2 }, { k: "film", c: "filmstill", w: 2 }, { k: "مشهد", c: "sceneplan", w: 2 },
  { k: "لقطات", c: "shotlist", w: 2 }, { k: "مطارده", c: "tracking", w: 2 }, { k: "chase", c: "tracking", w: 2 },
  /* ---------- بصري: إضاءة ---------- */
  { k: "غروب", c: "goldenhour", w: 3 }, { k: "ذهبيه", c: "goldenhour", w: 3 }, { k: "golden", c: "goldenhour", w: 3 }, { k: "sunset", c: "sunset", w: 3 },
  { k: "نيون", c: "neon", w: 3 }, { k: "neon", c: "neon", w: 3 }, { k: "مطر", c: "rain", w: 3 }, { k: "rain", c: "rain", w: 3 },
  { k: "ثلج", c: "snow", w: 3 }, { k: "ضباب", c: "fog", w: 3 }, { k: "fog", c: "fog", w: 3 }, { k: "ليل", c: "night", w: 2 }, { k: "night", c: "night", w: 2 },
  { k: "شروق", c: "sunrise", w: 3 }, { k: "استوديو", c: "studio", w: 2 }, { k: "volumetric", c: "volumetriclight", w: 3 },
  { k: "دخان", c: "smoke", w: 2 }, { k: "اضاءه", c: "dramaticlight", w: 1 }, { k: "lighting", c: "dramaticlight", w: 1 },
  /* ---------- بصري: فنون ---------- */
  { k: "الوان مائيه", c: "watercolor", w: 3 }, { k: "اكواريل", c: "watercolor", w: 3 }, { k: "watercolor", c: "watercolor", w: 3 },
  { k: "انمي", c: "anime", w: 3 }, { k: "anime", c: "anime", w: 3 }, { k: "مانجا", c: "manga", w: 3 }, { k: "manga", c: "manga", w: 3 },
  { k: "حبر", c: "ink", w: 3 }, { k: "رصاص", c: "pencil", w: 3 }, { k: "قصص مصوره", c: "comic", w: 3 }, { k: "comic", c: "comic", w: 3 },
  { k: "بكسل", c: "pixelart", w: 3 }, { k: "pixel", c: "pixelart", w: 3 }, { k: "low poly", c: "lowpoly", w: 3 }, { k: "lowpoly", c: "lowpoly", w: 3 },
  { k: "زجاج معشق", c: "stainedglass", w: 3 }, { k: "ورق مقصوص", c: "papercraft", w: 3 }, { k: "ريسوجراف", c: "risograph", w: 3 }, { k: "ريترو", c: "retro", w: 3 }, { k: "retro", c: "retro", w: 3 },
  { k: "فحم", c: "charcoal", w: 3 }, { k: "تصوير واقعي", c: "photorealistic", w: 2 }, { k: "كونسبت", c: "conceptart", w: 3 }, { k: "concept art", c: "conceptart", w: 3 },
  { k: "قصص اطفال", c: "storybook", w: 3 }, { k: "طين", c: "clay", w: 2 },
  /* ---------- بصري: تصميم ---------- */
  { k: "لوجو", c: "logo", w: 3 }, { k: "logo", c: "logo", w: 3 }, { k: "شعار", c: "logo", w: 3 },
  { k: "بوستر", c: "poster", w: 3 }, { k: "poster", c: "poster", w: 3 }, { k: "ملصق", c: "poster", w: 2 },
  { k: "غلاف", c: "cover", w: 3 }, { k: "cover", c: "cover", w: 3 }, { k: "غلاف البوم", c: "albumcover", w: 3 },
  { k: "تايبوجرافي", c: "typography", w: 3 }, { k: "typography", c: "typography", w: 3 }, { k: "خط عربي", c: "typography", w: 2 },
  { k: "بروشور", c: "brochure", w: 3 }, { k: "فلاير", c: "flyer", w: 3 }, { k: "ثامبنيل", c: "thumbnail", w: 3 }, { k: "thumbnail", c: "thumbnail", w: 3 }, { k: "مصغره", c: "thumbnail", w: 2 },
  { k: "كاروسيل", c: "carousel", w: 3 }, { k: "carousel", c: "carousel", w: 3 }, { k: "شرائح", c: "carousel", w: 2 },
  { k: "ايقونه", c: "icon", w: 3 }, { k: "icon", c: "icon", w: 3 }, { k: "ستيكر", c: "sticker", w: 3 }, { k: "sticker", c: "sticker", w: 3 },
  { k: "مودبورد", c: "moodboard", w: 3 }, { k: "moodboard", c: "moodboard", w: 3 }, { k: "لوحه الوان", c: "colorpalette", w: 3 },
  { k: "مجله", c: "magazine", w: 3 }, { k: "بانر", c: "banner", w: 2 }, { k: "هويه بصريه", c: "branding", w: 3 }, { k: "branding", c: "branding", w: 3 }, { k: "براند", c: "branding", w: 2 },
  /* ---------- بصري: منتجات ---------- */
  { k: "موكاب", c: "mockup", w: 3 }, { k: "mockup", c: "mockup", w: 3 },
  { k: "تغليف منتج", c: "packaging", w: 3 }, { k: "packaging", c: "packaging", w: 3 }, { k: "عبوه", c: "packaging", w: 3 },
  { k: "اعلان مصور", c: "advertisement", w: 3 }, { k: "advertisement", c: "advertisement", w: 3 }, { k: "حملات مصوره", c: "commercial", w: 2 },
  { k: "كتالوج", c: "catalog", w: 3 }, { k: "فاترين", c: "ecommerce", w: 3 }, { k: "ecommerce", c: "ecommerce", w: 3 },
  { k: "فاخر", c: "luxuryproduct", w: 3 }, { k: "بيلبورد", c: "billboard", w: 3 }, { k: "billboard", c: "billboard", w: 3 },
  { k: "تيشيرت", c: "tshirt", w: 3 }, { k: "كارت شخصي", c: "businesscard", w: 3 }, { k: "هيرو", c: "heroimage", w: 2 },
  /* ---------- بصري: تحرير صور ---------- */
  { k: "ارفع جوده", c: "upscale", w: 3 }, { k: "جوده اعلي", c: "upscale", w: 3 }, { k: "دقه اعلي", c: "upscale", w: 3 }, { k: "upscale", c: "upscale", w: 3 },
  { k: "حذف الخلفيه", c: "removebg", w: 3 }, { k: "شيل الخلفيه", c: "removebg", w: 3 }, { k: "remove background", c: "removebg", w: 3 },
  { k: "غير الخلفيه", c: "backgroundswap", w: 3 }, { k: "بدل الخلفيه", c: "backgroundswap", w: 3 }, { k: "استبدال الخلفيه", c: "backgroundswap", w: 3 }, { k: "background", c: "backgroundswap", w: 1 },
  { k: "احذف من الصوره", c: "remove", w: 3 }, { k: "حذف عنصر", c: "remove", w: 3 }, { k: "شيل من الصوره", c: "remove", w: 3 }, { k: "remove object", c: "remove", w: 3 },
  { k: "رمم", c: "restore", w: 3 }, { k: "ترميم", c: "restore", w: 3 }, { k: "restore", c: "restore", w: 3 }, { k: "صوره قديمه", c: "restoreoldphoto", w: 3 }, { k: "old photo", c: "restoreoldphoto", w: 3 },
  { k: "تلوين", c: "colorize", w: 3 }, { k: "colorize", c: "colorize", w: 3 }, { k: "حسن الصوره", c: "enhance", w: 3 }, { k: "enhance", c: "enhance", w: 2 },
  { k: "عزل", c: "isolate", w: 3 }, { k: "قص العنصر", c: "isolate", w: 3 }, { k: "isolate", c: "isolate", w: 3 }, { k: "cutout", c: "isolate", w: 3 },
  { k: "ترجم النص داخل الصوره", c: "translate", w: 3 }, { k: "translate text in image", c: "translate", w: 3 }, { k: "ترجم الكلام المكتوب", c: "translate", w: 3 },
  { k: "اعاده اضاءه", c: "relight", w: 3 }, { k: "relight", c: "relight", w: 3 },
  { k: "غير الالوان", c: "recolor", w: 3 }, { k: "recolor", c: "recolor", w: 3 }, { k: "وسع الكادر", c: "outpaint", w: 3 }, { k: "outpaint", c: "outpaint", w: 3 },
  { k: "تدرج لوني", c: "colorgrade", w: 3 }, { k: "color grade", c: "colorgrade", w: 3 },
  /* ---------- بصري: اتساق ---------- */
  { k: "نفس الشخصيه", c: "characterconsistency", w: 3 }, { k: "شخصيه ثابته", c: "characterconsistency", w: 3 }, { k: "اتساق", c: "characterconsistency", w: 2 }, { k: "consistent character", c: "characterconsistency", w: 3 }, { k: "consistency", c: "characterconsistency", w: 2 },
  { k: "نفس الاسلوب", c: "styleconsistency", w: 3 }, { k: "دوران الشخصيه", c: "characterturnaround", w: 3 }, { k: "turnaround", c: "characterturnaround", w: 3 },
  { k: "مرجع بصري", c: "referencebased", w: 3 }, { k: "reference image", c: "referencebased", w: 3 }, { k: "model sheet", c: "modelsheet", w: 3 },
  /* ---------- بصري: مفاهيمي ---------- */
  { k: "استعاره", c: "metaphor", w: 3 }, { k: "مجاز", c: "metaphor", w: 2 }, { k: "مفهوم", c: "conceptualize", w: 2 }, { k: "concept", c: "conceptualize", w: 2 },
  { k: "قبل وبعد", c: "beforeafter", w: 3 }, { k: "قبل و بعد", c: "beforeafter", w: 3 }, { k: "before after", c: "beforeafter", w: 3 }, { k: "before/after", c: "beforeafter", w: 3 },
  { k: "مستقبل", c: "future", w: 2 }, { k: "future", c: "future", w: 2 }, { k: "تطور", c: "evolution", w: 2 }, { k: "رمزي", c: "symbolic", w: 2 },
  /* ---------- بصري: سوشيال ---------- */
  { k: "ريلز", c: "ugc", w: 2 }, { k: "تيك توك", c: "ugc", w: 2 }, { k: "ugc", c: "ugc", w: 3 }, { k: "سوشيال", c: "socialvisual", w: 3 }, { k: "social", c: "socialvisual", w: 2 },
  { k: "b-roll", c: "broll", w: 3 }, { k: "ملاحظات لاصقه", c: "stickynotes", w: 3 },
  /* ---------- بصري: شرح ---------- */
  { k: "اشرح بصريا", c: "eli5", w: 3 }, { k: "شرح بصري", c: "eli5", w: 3 }, { k: "ببساطه بصريه", c: "simplify", w: 2 }, { k: "simplify", c: "simplify", w: 2 },
  { k: "علمني بالرسم", c: "teachme", w: 3 }, { k: "cheat sheet", c: "cheatsheet", w: 3 }, { k: "مرجع سريع مصور", c: "cheatsheet", w: 2 },
  { k: "فلاش كارد", c: "flashcards", w: 3 }, { k: "flashcards", c: "flashcards", w: 3 }, { k: "بطاقات مصوره", c: "flashcards", w: 2 },
  { k: "تشبيه بصري", c: "analogy", w: 3 }, { k: "analogy", c: "analogy", w: 2 }, { k: "كويز مصور", c: "quiz", w: 3 },
  /* ---------- بصري: أعمال ---------- */
  { k: "swot", c: "swot", w: 3 }, { k: "سوات", c: "swot", w: 3 }, { k: "خارطه طريق مصوره", c: "roadmap", w: 3 }, { k: "roadmap", c: "roadmap", w: 2 },
  { k: "استراتيجيه بصريه", c: "strategy", w: 3 }, { k: "نموذج عمل مصور", c: "businessmodel", w: 3 }, { k: "business model canvas", c: "businessmodel", w: 3 },
  { k: "pitch visual", c: "pitch", w: 3 }, { k: "عرض استثماري مصور", c: "pitch", w: 3 }, { k: "مصفوفه قرار", c: "decisionmatrix", w: 3 }, { k: "benchmark chart", c: "benchmark", w: 3 },

  /* ================= مهام: برمجة ================= */
  { k: "كود", c: "code", w: 3 }, { k: "code", c: "code", w: 3 }, { k: "برمج", c: "code", w: 2 }, { k: "بايثون", c: "code", w: 2 }, { k: "python", c: "code", w: 2 },
  { k: "جافا سكريبت", c: "code", w: 2 }, { k: "javascript", c: "code", w: 2 }, { k: "سكريبت", c: "code", w: 2 }, { k: "program", c: "code", w: 2 },
  { k: "خطا في الكود", c: "debug", w: 3 }, { k: "مشكله في الكود", c: "debug", w: 3 }, { k: "يطلع خطا", c: "debug", w: 2 }, { k: "debug", c: "debug", w: 3 }, { k: "ديباج", c: "debug", w: 3 }, { k: "صلح الكود", c: "debug", w: 3 }, { k: "bug", c: "debug", w: 3 },
  { k: "اعاده هيكله", c: "refactor", w: 3 }, { k: "refactor", c: "refactor", w: 3 },
  { k: "اختبارات", c: "unittest", w: 3 }, { k: "unit test", c: "unittest", w: 3 }, { k: "اختبر الكود", c: "unittest", w: 3 },
  { k: "استعلام", c: "sqlquery", w: 3 }, { k: "sql", c: "sqlquery", w: 3 }, { k: "قاعده بيانات", c: "sqlquery", w: 2 },
  { k: "api", c: "apidesign", w: 3 }, { k: "واجهه برمجه", c: "apidesign", w: 3 },
  { k: "git", c: "gitflow", w: 2 }, { k: "docker", c: "dockerize", w: 3 },
  { k: "خوارزم", c: "algorithms", w: 3 }, { k: "تعبير نمطي", c: "regex", w: 3 }, { k: "regex", c: "regex", w: 3 },
  { k: "ثغره", c: "securityaudit", w: 3 }, { k: "حمايه الكود", c: "securityaudit", w: 2 },
  { k: "ci/cd", c: "deploy", w: 3 }, { k: "انشر التطبيق", c: "deploy", w: 2 },
  { k: "اشرح الكود", c: "codeexplain", w: 3 }, { k: "explain the code", c: "codeexplain", w: 3 },
  { k: "حول الكود", c: "convertcode", w: 3 }, { k: "convert code", c: "convertcode", w: 3 },
  { k: "حسن الكود", c: "optimize", w: 3 }, { k: "optimiz", c: "optimize", w: 2 },
  /* ================= مهام: بحث ================= */
  { k: "ابحث عن", c: "research", w: 3 }, { k: "بحث عن", c: "research", w: 3 }, { k: "research", c: "research", w: 3 }, { k: "دراسه حول", c: "research", w: 3 },
  { k: "لخص", c: "summarize", w: 3 }, { k: "تلخيص", c: "summarize", w: 3 }, { k: "summarize", c: "summarize", w: 3 },
  { k: "مصادر موثوقه", c: "sourcerank", w: 3 }, { k: "مراجع", c: "cite", w: 2 }, { k: "apa", c: "cite", w: 3 }, { k: "citation", c: "cite", w: 3 },
  { k: "تحقق من", c: "factcheck", w: 3 }, { k: "fact check", c: "factcheck", w: 3 },
  { k: "دراسات سابقه", c: "literature", w: 3 }, { k: "ورقه علميه", c: "literature", w: 3 }, { k: "arxiv", c: "arxivscan", w: 3 },
  { k: "استبيان", c: "surveydesign", w: 3 }, { k: "tl;dr", c: "tldr", w: 3 }, { k: "خلاصه سريعه", c: "tldr", w: 3 },
  { k: "فجوه بحثيه", c: "gapanalysis", w: 3 }, { k: "اسئله مقابله", c: "interviewprep", w: 3 }, { k: "interview", c: "interviewprep", w: 2 },
  /* ================= مهام: كتابة ================= */
  { k: "اكتب مقال", c: "blogpost", w: 3 }, { k: "مقال", c: "blogpost", w: 3 }, { k: "blog", c: "blogpost", w: 3 }, { k: "article", c: "blogpost", w: 2 },
  { k: "اكتب لي", c: "write", w: 2 }, { k: "اكتب", c: "write", w: 2 }, { k: "write", c: "write", w: 2 },
  { k: "اعد صياغه", c: "rewrite", w: 3 }, { k: "صياغه", c: "rewrite", w: 2 }, { k: "rewrite", c: "rewrite", w: 3 },
  { k: "دقق", c: "proofread", w: 3 }, { k: "تدقيق", c: "proofread", w: 3 }, { k: "proofread", c: "proofread", w: 3 }, { k: "اخطاء املائيه", c: "proofread", w: 3 },
  { k: "نبره", c: "toneadjust", w: 3 }, { k: "tone", c: "toneadjust", w: 2 },
  { k: "سيره ذاتيه", c: "resume", w: 3 }, { k: "resume", c: "resume", w: 3 }, { k: "cv", c: "resume", w: 3 },
  { k: "رساله بريديه", c: "emailcraft", w: 3 }, { k: "ايميل", c: "emailcraft", w: 2 }, { k: "email", c: "emailcraft", w: 2 },
  { k: "قصه قصيره", c: "story", w: 3 }, { k: "قصه", c: "story", w: 2 }, { k: "story", c: "story", w: 2 },
  { k: "سيناريو", c: "scriptwrite", w: 3 }, { k: "script", c: "scriptwrite", w: 2 }, { k: "بودكاست", c: "scriptwrite", w: 2 },
  { k: "عناوين جذابه", c: "headlines", w: 3 }, { k: "hook", c: "hooks", w: 3 },
  { k: "خطاب تغطيه", c: "coverletter", w: 3 }, { k: "cover letter", c: "coverletter", w: 3 },
  { k: "كثف النص", c: "condensetext", w: 3 }, { k: "اختصر", c: "condensetext", w: 2 }, { k: "وسع النص", c: "expandtext", w: 3 },
  { k: "هيكل مقال", c: "outline", w: 3 }, { k: "outline", c: "outline", w: 3 }, { k: "شعر", c: "poetry", w: 3 },
  { k: "نص تسويقي", c: "ctacopy", w: 2 }, { k: "call to action", c: "ctacopy", w: 3 },
  /* ================= مهام: بيانات ================= */
  { k: "بيانات", c: "analyzedata", w: 3 }, { k: "data", c: "analyzedata", w: 2 },
  { k: "اكسل", c: "spreadsheet", w: 3 }, { k: "excel", c: "spreadsheet", w: 3 },
  { k: "csv", c: "cleandata", w: 2 }, { k: "تنظيف بيانات", c: "cleandata", w: 3 }, { k: "قيم ناقصه", c: "cleandata", w: 3 },
  { k: "احصا", c: "statistics", w: 3 }, { k: "statistic", c: "statistics", w: 3 },
  { k: "توقعات", c: "forecast", w: 3 }, { k: "forecast", c: "forecast", w: 3 },
  { k: "تحليل مشاعر", c: "sentiment", w: 3 }, { k: "sentiment", c: "sentiment", w: 3 },
  { k: "اختبار a/b", c: "abtest", w: 3 }, { k: "ab test", c: "abtest", w: 3 },
  { k: "رسوم بيانيه", c: "dataviz", w: 3 }, { k: "charts", c: "dataviz", w: 2 },
  { k: "تقسيم عملاء", c: "segmentation", w: 3 }, { k: "segments", c: "segmentation", w: 2 },
  { k: "kpi", c: "kpis", w: 3 }, { k: "مؤشرات اداء", c: "kpis", w: 3 },
  { k: "انحدار", c: "regression", w: 3 }, { k: "pivot", c: "pivottable", w: 3 },
  { k: "تقرير بيانات", c: "datareport", w: 3 }, { k: "سحب بيانات", c: "scraping", w: 3 }, { k: "scraping", c: "scraping", w: 3 }, { k: "etl", c: "etl", w: 3 },
  /* ================= مهام: تسويق ================= */
  { k: "تسويق", c: "funnel", w: 2 }, { k: "marketing", c: "funnel", w: 2 },
  { k: "سيو", c: "seo", w: 3 }, { k: "seo", c: "seo", w: 3 },
  { k: "كلمات مفتاحيه", c: "keywords", w: 3 }, { k: "keywords", c: "keywords", w: 3 },
  { k: "نص اعلاني", c: "adscopy", w: 3 }, { k: "ادكوبي", c: "adscopy", w: 2 }, { k: "ad copy", c: "adscopy", w: 3 },
  { k: "قمع", c: "funnel", w: 3 }, { k: "funnel", c: "funnel", w: 3 },
  { k: "جمهور مستهدف", c: "buyerpersona", w: 3 }, { k: "persona", c: "buyerpersona", w: 3 },
  { k: "منافسين", c: "competitors", w: 3 }, { k: "competitor", c: "competitors", w: 3 },
  { k: "تقويم محتوي", c: "contentcalendar", w: 3 }, { k: "content calendar", c: "contentcalendar", w: 3 }, { k: "خطه محتوي", c: "contentcalendar", w: 3 },
  { k: "حملات ايميل", c: "emailcampaign", w: 3 },
  { k: "صفحه هبوط", c: "landingpage", w: 3 }, { k: "landing page", c: "landingpage", w: 3 },
  { k: "صوت العلامه", c: "brandvoice", w: 3 },
  { k: "نمو", c: "growthloop", w: 2 }, { k: "growth", c: "growthloop", w: 2 },
  { k: "utm", c: "utmplan", w: 3 }, { k: "اعاده استهداف", c: "retargeting", w: 3 }, { k: "مؤثرين", c: "influencerbrief", w: 3 },
  /* ================= مهام: إدارة وأعمال ================= */
  { k: "خطه عمل", c: "businessplan", w: 3 }, { k: "business plan", c: "businessplan", w: 3 },
  { k: "نموذج مالي", c: "financialmodel", w: 3 }, { k: "financial model", c: "financialmodel", w: 3 },
  { k: "pitch deck", c: "pitchdeck", w: 3 }, { k: "عرض استثماري", c: "pitchdeck", w: 3 },
  { k: "تسعير", c: "pricingstrategy", w: 3 }, { k: "pricing", c: "pricingstrategy", w: 3 },
  { k: "ميزانيه", c: "budgetplan", w: 3 }, { k: "budget", c: "budgetplan", w: 3 },
  { k: "تدفق نقدي", c: "cashflow", w: 3 }, { k: "cashflow", c: "cashflow", w: 3 },
  { k: "تقييم شركه", c: "valuation", w: 3 }, { k: "valuation", c: "valuation", w: 3 },
  { k: "دراسه سوق", c: "marketresearch", w: 3 }, { k: "market research", c: "marketresearch", w: 3 },
  { k: "تفاوض", c: "negotiation", w: 3 }, { k: "راتب", c: "negotiation", w: 2 },
  { k: "عقد", c: "contractdraft", w: 2 }, { k: "contract", c: "contractdraft", w: 2 },
  { k: "فاتوره", c: "invoicetpl", w: 3 }, { k: "invoice", c: "invoicetpl", w: 3 },
  { k: "okr", c: "okr", w: 3 }, { k: "اهداف ونتائج", c: "okr", w: 3 },
  /* ================= مهام: تعليم ================= */
  { k: "اشرح لي", c: "explainconcept", w: 3 }, { k: "explain", c: "explainconcept", w: 2 },
  { k: "خطه مذاكره", c: "studyplan", w: 3 }, { k: "مذاكره", c: "studyplan", w: 2 }, { k: "study plan", c: "studyplan", w: 3 },
  { k: "anki", c: "ankicards", w: 3 }, { k: "بطاقات استذكار", c: "ankicards", w: 3 },
  { k: "حفظ سريع", c: "mnemonics", w: 3 },
  { k: "واجب", c: "homework", w: 3 }, { k: "homework", c: "homework", w: 3 },
  { k: "امتحان", c: "examprep", w: 3 }, { k: "exam", c: "examprep", w: 3 },
  { k: "منهج", c: "curriculum", w: 3 }, { k: "curriculum", c: "curriculum", w: 3 },
  { k: "حصه", c: "lessonplan", w: 3 }, { k: "lesson plan", c: "lessonplan", w: 3 },
  { k: "معايير تقييم", c: "rubric", w: 3 }, { k: "تكرار متباعد", c: "spacedrep", w: 3 },
  { k: "معلم خصوصي", c: "tutor", w: 3 }, { k: "tutor", c: "tutor", w: 3 },
  { k: "مذكرات", c: "notemaking", w: 2 }, { k: "كورنيل", c: "notemaking", w: 3 },
  /* ================= مهام: إنتاجية ================= */
  { k: "اولويات", c: "prioritize", w: 3 }, { k: "prioritiz", c: "prioritize", w: 3 },
  { k: "قائمه مهام", c: "todo", w: 3 }, { k: "todo", c: "todo", w: 3 }, { k: "مهامي", c: "todo", w: 2 },
  { k: "جدول اعمال", c: "agenda", w: 3 }, { k: "agenda", c: "agenda", w: 3 }, { k: "اجتماع", c: "agenda", w: 1 },
  { k: "محضر اجتماع", c: "minutes", w: 3 }, { k: "meeting minutes", c: "minutes", w: 3 },
  { k: "عادات", c: "habittrack", w: 3 }, { k: "habits", c: "habittrack", w: 3 },
  { k: "يوميات", c: "journaling", w: 3 }, { k: "journal", c: "journaling", w: 2 },
  { k: "retrospective", c: "retro", w: 3 }, { k: "كانبان", c: "kanban", w: 3 }, { k: "kanban", c: "kanban", w: 3 },
  { k: "time block", c: "timeblock", w: 3 }, { k: "تفويض", c: "delegation", w: 3 },
  { k: "قائمه تحقق", c: "checklist", w: 3 }, { k: "checklist", c: "checklist", w: 3 },
  { k: "مراجعه اسبوعيه", c: "weeklyreview", w: 3 },
  { k: "نظم يومي", c: "schedule", w: 3 }, { k: "جدول زمني", c: "schedule", w: 3 }, { k: "schedule", c: "schedule", w: 2 },
  { k: "خطط لي", c: "plan", w: 3 }, { k: "plan my", c: "plan", w: 3 }, { k: "خطه تنفيذيه", c: "plan", w: 3 },
  { k: "سجل قرارات", c: "decisionlog", w: 3 },
  /* ================= مهام: لغات ================= */
  { k: "ترجم", c: "translatepro", w: 3 }, { k: "translate", c: "translatepro", w: 2 }, { k: "ترجمه احترافيه", c: "translatepro", w: 3 },
  { k: "توطين تطبيق", c: "localizeui", w: 3 }, { k: "localization", c: "localizeui", w: 3 },
  { k: "قواعد اللغه", c: "grammarfix", w: 3 }, { k: "grammar", c: "grammarfix", w: 3 },
  { k: "مسرد", c: "glossary", w: 3 }, { k: "glossary", c: "glossary", w: 3 },
  { k: "لهجه", c: "dialect", w: 3 }, { k: "ترجمه فيديو", c: "subtitling", w: 3 }, { k: "subtitl", c: "subtitling", w: 3 },
  { k: "نقحره", c: "transliterate", w: 3 }, { k: "تعلم لغه", c: "languagecoach", w: 3 }, { k: "learn english", c: "languagecoach", w: 3 },
  { k: "تعابير", c: "idioms", w: 2 }, { k: "دليل اسلوب", c: "styleguide", w: 3 }, { k: "style guide", c: "styleguide", w: 3 },
];

const NUM_WORDS: [string, number][] = [
  ["واحده", 1], ["واحد", 1], ["اتنين", 2], ["اثنين", 2], ["اثنتين", 2], ["ثلاث", 3], ["اربع", 4], ["خمس", 5],
  ["سته", 6], ["سبع", 7], ["ثمان", 8], ["تسع", 9], ["عشر", 10], ["عشره", 10], ["اثني عشر", 12], ["ست", 6],
];
const AR_NUMS: Record<string, number> = { "٠": 0, "١": 1, "٢": 2, "٣": 3, "٤": 4, "٥": 5, "٦": 6, "٧": 7, "٨": 8, "٩": 9 };

const SUBJECT_MAP: [string, string][] = [
  ["محرك", "a combustion engine"], ["سياره", "a car"], ["سفينه", "a ship"], ["طائره", "an aircraft"], ["توربين", "a turbine"],
  ["قلب", "a human heart"], ["دماغ", "a human brain"], ["عين", "a human eye"], ["رئه", "human lungs"], ["هيكل عظمي", "a human skeleton"],
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
  /* مواضيع مهام */
  ["مقال", "an article"], ["سيره ذاتيه", "a resume"], ["خطه عمل", "a business plan"], ["ميزانيه", "a budget"], ["عقد", "a contract"],
  ["استبيان", "a survey"], ["تقرير", "a report"], ["درس", "a lesson"], ["اجتماع", "a meeting"], ["رساله", "an email"], ["قاعده بيانات", "a database"],
  ["طاقه شمسيه", "solar energy"], ["راتب", "a salary"], ["مقهي", "a café business"], ["متجر", "an online store"],
];

export interface FeatureFlags {
  text: boolean; arabicText: boolean; photo: boolean; edit: boolean; multi: boolean; consistency: boolean;
  count: number | null; countNote: Bi; ratio: string | null; ratioNote: Bi;
}
export interface PickedCommand { cmd: CommandDef; catId: string; catTitle: string; catEn: string; catKind: "visual" | "task"; explicit: boolean; }
export interface ModelScore { modelId: string; name: string; ar: string; hue: string; score: number; pct: number; reasons: Bi[]; st: string; stAr: string; }
export interface Analysis {
  summary: Bi; subjectAr: string; subjectEn: string;
  kind: "visual" | "task";
  cats: { id: string; title: string; en: string; score: number; kind: "visual" | "task" }[];
  commands: PickedCommand[]; models: ModelScore[];
  features: FeatureFlags; userText: string; stackLine: string;
}

/* ================= التحليل ================= */
export interface FileHint { name: string; ext: string; }

/* تلميحات نوعية الملف → كلمات مفتاحية يفهمها المحرك */
const EXT_HINTS: Record<string, string> = {
  csv: "csv تحليل بيانات dataviz", xlsx: "excel بيانات spreadsheet", xls: "excel بيانات",
  pdf: "pdf لخص بحث summarize", doc: "مقال اكتب", docx: "مقال اكتب", txt: "لخص summarize", md: "اكتب outline",
  json: "code json", js: "code javascript", ts: "code javascript", tsx: "code javascript", jsx: "code javascript",
  py: "code python", java: "code جافا", cs: "code", go: "code", rb: "code", php: "code", sql: "sqlquery",
  html: "code html", css: "code تصميم", sh: "code script", yml: "code", yaml: "code",
  jpg: "صوره واقعيه", jpeg: "صوره", png: "صوره", webp: "صوره", gif: "صوره", bmp: "صوره", tiff: "صوره", heic: "صوره",
  psd: "تصميم photoshop", ai: "تصميم", fig: "mockup تصميم", svg: "icon تصميم", sketch: "تصميم",
  mp3: "ترجمه فيديو subtitling", wav: "ترجمه فيديو", m4a: "ترجمه فيديو", flac: "ترجمه فيديو",
  mp4: "فيديو storyboard", mov: "فيديو storyboard", mkv: "فيديو", avi: "فيديو", webm: "فيديو",
  zip: "ملف مضغوط", rar: "ملف مضغوط", "7z": "ملف مضغوط", tar: "ملف مضغوط", gz: "ملف مضغوط",
  pptx: "pitch عرض تقديمي", ppt: "pitch عرض", key: "pitch عرض",
};

export function analyze(raw: string, files?: FileHint[]): Analysis | null {
  const text = raw.toLowerCase();
  let norm = normalize(text);
  if (files && files.length) {
    const hintWords = files
      .map((f) => EXT_HINTS[f.ext.toLowerCase()] ?? "")
      .filter(Boolean)
      .join(" ");
    if (hintWords) norm += " " + normalize(hintWords);
  }
  const tokens = new Set(norm.split(/[^a-z0-9]+/).filter(Boolean));

  const explicit = new Set<string>();
  for (const m of text.matchAll(/\/([a-z0-9]+)/g)) {
    const name = m[1];
    if (COMMAND_INDEX.has(name)) explicit.add(name);
    else if (RELATED[name]) explicit.add(RELATED[name]);
  }

  const cmdScore = new Map<string, number>();
  for (const n of explicit) cmdScore.set(n, (cmdScore.get(n) ?? 0) + 4);
  for (const rule of RULES) {
    if (matchKeyword(norm, tokens, normalize(rule.k))) {
      cmdScore.set(rule.c, (cmdScore.get(rule.c) ?? 0) + (rule.w ?? 2));
    }
  }

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
    picked.push({ cmd: hit.cmd, catId: hit.cat.id, catTitle: hit.cat.title, catEn: hit.cat.en, catKind: hit.cat.kind, explicit: explicit.has(name) });
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
        if (hit) { picked.push({ cmd: hit.cmd, catId: hit.cat.id, catTitle: hit.cat.title, catEn: hit.cat.en, catKind: hit.cat.kind, explicit: false }); usedCats.add(cid); }
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
      return { id, title: cat.title, en: cat.en, score, kind: cat.kind };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);

  if (picked.length === 0 && cats.length === 0) return null;

  /* تحديد المحور: بصري أم مهام */
  let taskW = 0, visualW = 0;
  for (const p of picked) {
    const w = cmdScore.get(p.cmd.name) ?? 1;
    if (p.catKind === "task") taskW += w; else visualW += w;
  }
  const kind: "visual" | "task" = taskW > visualW ? "task" : "visual";
  const ENGINES = enginesFor(kind);

  const features: FeatureFlags = {
    text: /(نص داخل|كتابه داخل|كلمه داخل|عباره داخل|text in|typography|حروف)/.test(norm) || usedCats.has("design"),
    arabicText: /(خط عربي|عربي|بالعربيه|اسم عربي|arabic)/.test(norm),
    photo: /(واقعي|فوتو|تصوير|photo|realistic)/.test(norm) || usedCats.has("photo"),
    edit: usedCats.has("editing") || /(ارفق|صورتي|الصوره دي|هذه الصوره|عدل علي|edit this|attached)/.test(norm),
    multi: ["storyboard", "carousel", "360view", "multiview", "characterturnaround", "sceneplan", "shotlist", "flashcards", "thenvsnow"].some((n) => cmdScore.has(n)),
    consistency: usedCats.has("consistency"),
    count: null, countNote: { ar: "", en: "" }, ratio: null, ratioNote: { ar: "", en: "" },
  };

  const numStr = norm.replace(/[٠-٩]/g, (d) => String(AR_NUMS[d]));
  const asYouSpec = { ar: "كما حددت في طلبك", en: "as you specified" };

  if (kind === "task") {
    /* عدد المخرجات */
    const mTask = numStr.match(/(\d+)\s*(مقال|ملف|تقرير|نسخه|صفحه|رساله|بطاقه|articles|files|reports|pages|emails|cards|words)/);
    if (mTask) { features.count = Math.min(60, parseInt(mTask[1], 10)); features.countNote = asYouSpec; }
    else {
      for (const [w, n] of NUM_WORDS) {
        if (/(مقال|ملف|تقرير|نسخه|رساله)/.test(w) === false && (norm.includes(w + " مقال") || norm.includes(w + " ملف") || norm.includes(w + " تقرير"))) {
          features.count = n; features.countNote = asYouSpec; break;
        }
      }
    }
    if (features.count === null) {
      if (cmdScore.has("contentcalendar")) { features.count = 30; features.countNote = { ar: "تقويم شهر افتراضي (30 منشورًا)", en: "monthly calendar default (30 posts)" }; }
      else if (cmdScore.has("adscopy") || cmdScore.has("headlines")) { features.count = 5; features.countNote = { ar: "5 نسخ للاختيار منها", en: "5 variants to choose from" }; }
      else if (cmdScore.has("ankicards") || cmdScore.has("flashcards")) { features.count = 20; features.countNote = { ar: "20 بطاقة استذكار", en: "20 flashcards" }; }
      else { features.count = 1; features.countNote = { ar: "مخرَج واحد مركز", en: "one focused deliverable" }; }
    }
    /* صيغة التسليم */
    const topTaskCat = picked.find((p) => p.catKind === "task")?.catId ?? cats.find((x) => x.kind === "task")?.id ?? "writing";
    const FORMATS: Record<string, Bi> = {
      coding: { ar: "ملفات كود قابلة للتشغيل + تعليقات", en: "runnable code files + comments" },
      research: { ar: "تقرير Markdown موثق بمصادر", en: "Markdown report with citations" },
      writing: { ar: "Markdown / Word", en: "Markdown / Word" },
      data: { ar: "CSV/JSON + تقرير تنفيذي", en: "CSV/JSON + executive report" },
      marketing: { ar: "خطة Markdown + جداول", en: "Markdown plan + tables" },
      bizops: { ar: "خطة Markdown + نماذج مالية", en: "Markdown plan + financial models" },
      education: { ar: "Markdown + بطاقات", en: "Markdown + cards" },
      productivity: { ar: "قوائم Markdown قابلة للنسخ", en: "copy-ready Markdown lists" },
      languages: { ar: "نص مترجم + مسرد مصطلحات", en: "translated text + glossary" },
    };
    const f = FORMATS[topTaskCat] ?? FORMATS.writing;
    features.ratio = f.ar; features.ratioNote = { ar: "صيغة التسليم", en: f.en };
  } else {
    /* عدد الصور */
    const mCount = numStr.match(/(\d+)\s*(صور|لقط|صفح|panels|slides|مشاهد|images|shots|frames)/);
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
    /* الأبعاد */
    const mRatio = numStr.match(/(\d{1,2})\s*[:x×]\s*(\d{1,2})/);
    if (mRatio) { features.ratio = `${mRatio[1]}:${mRatio[2]}`; features.ratioNote = asYouSpec; }
    else if (/(مربع|square)/.test(norm)) { features.ratio = "1:1"; features.ratioNote = { ar: "مربع", en: "square" }; }
    else if (/(ستوري|ريلز|تيك توك|طولي|vertical|reel)/.test(norm)) { features.ratio = "9:16"; features.ratioNote = { ar: "عمودي للسوشيال", en: "vertical for social" }; }
    else if (/(بانوراما|سينمائي|cinematic|panorama)/.test(norm) || cmdScore.has("panoramic") || cmdScore.has("cinematic")) { features.ratio = "21:9"; features.ratioNote = { ar: "سينمائي عريض", en: "cinematic wide" }; }
    else if (/(بوستر|غلاف|بروشور|poster|cover)/.test(norm) || cmdScore.has("poster") || cmdScore.has("cover")) { features.ratio = "2:3"; features.ratioNote = { ar: "طولي للمطبوعات", en: "portrait for print" }; }
    else if (cmdScore.has("floorplan") || cmdScore.has("siteplan")) { features.ratio = "4:3"; features.ratioNote = { ar: "مناسب للمساقط", en: "suited to plans" }; }
    else { features.ratio = "16:9"; features.ratioNote = { ar: "افتراضي واسع", en: "wide default" }; }
  }

  /* ================= تقييم المحركات على المحور النشط ================= */
  const modelScores = ENGINES.map(() => 0);
  const reasons: Bi[][] = ENGINES.map(() => []);
  const rate = (r: string, i: number) => parseInt(r[i], 10);
  const I = (id: string) => ENGINES.findIndex((m) => m.id === id);
  const boost = (idx: number, pts: number, arR: string, enR: string) => {
    if (idx < 0) return;
    modelScores[idx] += pts;
    if (pts >= 2) reasons[idx].push({ ar: arR, en: enR });
  };

  for (const p of picked) {
    if (p.catKind !== kind) continue;
    const w = p.explicit ? 2 : 1;
    for (let i = 0; i < ENGINES.length; i++) modelScores[i] += rate(p.cmd.r, i) * w;
  }
  for (const cInfo of cats) {
    if (cInfo.kind !== kind) continue;
    const cat = CATEGORIES.find((x) => x.id === cInfo.id)!;
    const tops = cat.top.map((tn) => COMMAND_INDEX.get(tn)).filter(Boolean);
    for (let i = 0; i < ENGINES.length; i++) {
      const avg = tops.reduce((s, tn) => s + rate(tn!.cmd.r, i), 0) / Math.max(1, tops.length);
      modelScores[i] += avg * Math.min(3, cInfo.score) * 0.6;
    }
  }

  /* تفضيل صريح من المستخدم */
  if (kind === "task") {
    const MENTIONS: [RegExp, string][] = [
      [/(gpt|chatgpt|جي بي تي)/, "gpt5"], [/(claude|كلود)/, "claude"], [/(gemini|جيميناي)/, "gemini"], [/(grok|جروك)/, "grok"],
      [/(perplexity|بيربلكستي)/, "perplexity"], [/(deepseek|ديب سيك)/, "deepseek"], [/(qwen|كيون)/, "qwen"], [/(llama|لاما)/, "llama"],
    ];
    for (const [re, id] of MENTIONS) if (re.test(norm)) boost(I(id), 9, "المساعد الذي فضّله المستخدم صراحة", "Assistant explicitly preferred by the user");
  } else {
    const MENTIONS: [RegExp, string][] = [
      [/(gpt|chatgpt|dall)/, "gpt"], [/(gemini|nano banana|جيميناي)/, "gemini"], [/(qwen|كيون)/, "qwen"], [/(flux|فلوكس)/, "flux"],
      [/(midjourney|ميدجورني)/, "midjourney"], [/(firefly|فايرفلاي)/, "firefly"], [/(ideogram|ايديوجرام|ايديوغرام)/, "ideogram"],
      [/(sdxl|stable diffusion|ستيبل ديفيوجن)/, "sdxl"],
    ];
    for (const [re, id] of MENTIONS) if (re.test(norm)) boost(I(id), 9, "النموذج الذي فضّله المستخدم صراحة", "Model explicitly preferred by the user");
  }

  if (kind === "task") {
    if (usedCats.has("coding")) {
      boost(I("claude"), 4, "برمجة عميقة وسياق طويل", "Deep coding with long context");
      boost(I("deepseek"), 3, "برمجة ورياضيات بكلفة منخفضة", "Cost-efficient coding & math");
      boost(I("gpt5"), 3, "استدلال قوي في الهندسة البرمجية", "Strong software-engineering reasoning");
    }
    if (usedCats.has("research")) {
      boost(I("perplexity"), 5, "مصادر حية موثقة مع كل ادعاء", "Live cited sources for every claim");
      boost(I("gemini"), 3, "سياق مليون توكن للمستندات الطويلة", "1M-token context for long documents");
      boost(I("grok"), 3, "وصول لحظي لأحدث المعلومات", "Real-time access to fresh information");
    }
    if (usedCats.has("writing")) {
      boost(I("claude"), 4, "كتابة طويلة طبيعية بلا ركاكة", "Natural long-form writing");
      boost(I("gpt5"), 3, "التزام دقيق بالأسلوب المطلوب", "Precise adherence to the requested style");
    }
    if (features.arabicText) boost(I("qwen"), 4, "إتقان عربي متفوق", "Superior Arabic fluency");
    if (usedCats.has("data")) {
      boost(I("gpt5"), 3, "تحليل رقمي واستدلال إحصائي", "Numerical analysis & statistical reasoning");
      boost(I("deepseek"), 2, "رياضيات بكفاءة كلفة", "Math at low cost");
    }
    if (usedCats.has("marketing")) {
      boost(I("grok"), 3, "اتجاهات لحظية من المنصات", "Real-time platform trends");
      boost(I("gpt5"), 2, "نصوص إقناعية محكمة", "Tight persuasive copy");
    }
    if (usedCats.has("bizops")) {
      boost(I("gpt5"), 3, "نمذجة مالية واستدلال مركب", "Financial modeling & compound reasoning");
      boost(I("claude"), 3, "وثائق أعمال صارمة البنية", "Rigorously structured business documents");
    }
    if (usedCats.has("education")) {
      boost(I("claude"), 3, "شرح صبور متعدد المستويات", "Patient multi-level explanations");
      boost(I("gpt5"), 3, "تعليم تفاعلي بالأمثلة", "Interactive example-driven teaching");
    }
    if (usedCats.has("productivity")) boost(I("gpt5"), 3, "هيكلة مهام قابلة للتنفيذ فورًا", "Instantly actionable task structure");
    if (usedCats.has("languages")) {
      boost(I("qwen"), 4, "ترجمة عربية/صينية بطلاقة", "Fluent Arabic/Chinese translation");
      boost(I("gpt5"), 3, "حفظ الأسلوب أثناء الترجمة", "Style-preserving translation");
    }
  } else {
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
  }

  const maxScore = Math.max(...modelScores);
  const winnerIdx = modelScores.indexOf(maxScore);
  if (reasons[winnerIdx].length === 0) {
    reasons[winnerIdx].push({ ar: "توازن عام قوي عبر الفئات المطلوبة", en: "Strong overall balance across the requested domains" });
  }
  const order = ENGINES.map((_, i) => i).sort((a, b) => modelScores[b] - modelScores[a]).slice(0, 3);
  const models: ModelScore[] = order.map((i) => ({
    modelId: ENGINES[i].id, name: ENGINES[i].name, ar: ENGINES[i].ar, hue: ENGINES[i].hue, st: ENGINES[i].st, stAr: ENGINES[i].stAr,
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
  if (kind === "task") {
    if (usedCats.has("coding")) notes.push({ ar: "مخرجات برمجية قابلة للتشغيل", en: "Runnable code outputs" });
    if (usedCats.has("research") || usedCats.has("data")) notes.push({ ar: "أرقام ومصادر يجب توثيقها", en: "Numbers & sources must be cited" });
    if (features.arabicText) notes.push({ ar: "محتوى عربي فصيح", en: "Fluent Arabic content" });
  } else {
    if (features.text) notes.push(features.arabicText
      ? { ar: "نص عربي داخل الصورة", en: "Arabic text inside the image" }
      : { ar: "نص/تايبوجرافي داخل الصورة", en: "Text/typography inside the image" });
    if (features.edit) notes.push({ ar: "تعديل على صورة قائمة", en: "Editing an existing image" });
    if (features.consistency) notes.push({ ar: "ثبات هوية عبر الصور", en: "Identity consistency across images" });
    if (features.multi) notes.push({ ar: "مخرجات متعددة الصور", en: "Multi-image outputs" });
    if (features.photo) notes.push({ ar: "طابع واقعي", en: "Realistic look" });
  }

  const cmdWord = kind === "task" ? { ar: "أوامر مهام", en: "task commands" } : { ar: "أوامر بصرية", en: "visual commands" };
  const engineWord = kind === "task" ? { ar: "مساعد الذكاء", en: "AI assistant" } : { ar: "النموذج", en: "model" };
  const fileNames = files && files.length ? files.map((f) => f.name).join("، ") : "";
  const fileNote: Bi = files && files.length
    ? { ar: ` استلمت ${files.length === 1 ? "ملفًا مرفقًا" : `${files.length} ملفات مرفقة`} (${fileNames}) ودمجت نوع ${files.length === 1 ? "الملف" : "الملفات"} في الترشيحات.` , en: ` I received ${files.length} attached file(s) (${fileNames}) and factored the file type(s) into the recommendations.` }
    : { ar: "", en: "" };
  const summary: Bi = {
    ar:
      `راجعت طلبك بدقة: ` +
      (subjectAr ? `الموضوع الأساسي «${subjectAr}» ضمن ` : ``) +
      `مجال ${catNames}. ` +
      (explicit.size ? `التقطت ${explicit.size} أمرًا صريحًا ذكرته، و` : ``) +
      `رشحت ${picked.length} ${cmdWord.ar} من القاموس. ` +
      (notes.length ? `ملاحظات مؤثرة على اختيار ${engineWord.ar}: ${notes.map((n) => n.ar).join("، ")}.` : `لا قيود خاصة مكتشفة — الاختيار حسب جودة الفئة.`) +
      fileNote.ar,
    en:
      `I reviewed your request carefully: ` +
      (subjectEn ? `the core subject is ${subjectEn}, within ` : ``) +
      `${catNamesEn}. ` +
      (explicit.size ? `I detected ${explicit.size} explicit command(s) you mentioned and ` : ``) +
      `shortlisted ${picked.length} ${cmdWord.en} from the dictionary. ` +
      (notes.length ? `${engineWord.en === "model" ? "Model" : "Assistant"}-selection drivers: ${notes.map((n) => n.en).join(", ")}.` : `No special constraints detected — selection is based on domain quality.`) +
      fileNote.en,
  };

  return { summary, subjectAr, subjectEn, kind, cats, commands: picked, models, features, userText: raw.trim(), stackLine };
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
  /* بصري */
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
  /* مهام */
  coding: { ar: "مهندس برمجيات (Staff Engineer) يكتب كودًا إنتاجيًا نظيفًا مع اختبارات", en: "a staff-level software engineer who writes clean, production-ready code with tests" },
  research: { ar: "باحث أكاديمي يوثق كل ادعاء بمصدر حي ولا يضيف رقمًا بلا مرجع", en: "an academic researcher who documents every claim with live sources and never adds uncited numbers" },
  writing: { ar: "كاتب محترف متعدد الأساليب بحس تحريري صارم", en: "a professional writer with a strict editorial ear" },
  data: { ar: "عالِم بيانات يحوّل الأرقام إلى قرارات ويتحقق من كل حساب", en: "a data scientist who turns numbers into decisions and double-checks every computation" },
  marketing: { ar: "خبير نمو يمزج الإبداع بالأرقام ويفهم خوارزميات المنصات", en: "a growth marketer blending creativity with metrics and platform algorithms" },
  bizops: { ar: "مستشار إدارة أعمال بدقة تقارير مجالس الإدارات", en: "a management consultant with boardroom-grade rigor" },
  education: { ar: "معلم خبير يبسّط بلا إفراط ويقيس الفهم بأسئلة", en: "an expert teacher who simplifies without dumbing down and checks understanding" },
  productivity: { ar: "مدرّب إنتاجية عملي يحوّل الفوضى إلى نظام قابل للتنفيذ فورًا", en: "a practical productivity coach who turns chaos into an instantly executable system" },
  languages: { ar: "مترجم محترف معتمد يحفظ الأسلوب والسياق الثقافي", en: "a certified professional translator preserving style and cultural context" },
};

export interface PromptSection { h: Bi; body: Bi; }
export interface BuiltPrompt {
  title: Bi;
  kind: "visual" | "task";
  meta: { model: string; stack: string; count: number; ratio: Bi; halluc: Bi; hallucPct: number };
  sections: PromptSection[];
  paste: string;
}

export function buildPrompt(a: Analysis): BuiltPrompt {
  const isTask = a.kind === "task";
  const topCat = a.cats[0]?.id ?? (isTask ? "writing" : "design");
  const persona = PERSONA[topCat] ?? PERSONA[isTask ? "writing" : "design"];
  const top = a.models[0];
  const altModels = a.models.slice(1).map((m) => m.name).join(" · ");
  const topReason = top.reasons[0] ?? { ar: top.stAr, en: top.st };

  let halluc: Bi; let hallucPct: number;
  if (isTask) {
    if (["coding", "data", "bizops"].includes(topCat)) { halluc = { ar: "صارم: ≤ 5% — بلا أرقام أو مصادر مخترعة", en: "Strict: ≤ 5% — no invented numbers or sources" }; hallucPct = 5; }
    else if (["research", "education", "languages", "productivity"].includes(topCat)) { halluc = { ar: "منخفض: ≤ 10% — مع توثيق المصادر", en: "Low: ≤ 10% — with cited sources" }; hallucPct = 10; }
    else { halluc = { ar: "إبداعي متحكم به: 15–20%", en: "Controlled creative: 15–20%" }; hallucPct = 18; }
  } else {
    if (["engineering", "medical", "architecture", "diagram"].includes(topCat) || a.features.text) { halluc = { ar: "صارم: ≤ 5%", en: "Strict: ≤ 5%" }; hallucPct = 5; }
    else if (["photo", "cinematic", "product", "editing"].includes(topCat)) { halluc = { ar: "منخفض: ≤ 10%", en: "Low: ≤ 10%" }; hallucPct = 10; }
    else { halluc = { ar: "إبداعي متحكم به: 15–20%", en: "Controlled creative: 15–20%" }; hallucPct = 18; }
  }

  const count = a.features.count ?? 1;
  const ratio = a.features.ratio ?? (isTask ? "Markdown" : "16:9");
  const subjectEn = a.subjectEn || "the exact subject described in the client brief";
  const ops = a.commands.map((p) => p.cmd.name).join(" + ");

  const cmdAr = a.commands.map((p, i) => `${i + 1}. /${p.cmd.name} — ${p.cmd.fn} ← النتيجة: ${isTask ? "تنفيذ هذه العملية على الطلب مع الحفاظ على اتساق المخرجات." : "تطبيق هذه العملية البصرية على الموضوع مع الحفاظ على الاتساق بين كل المخرجات."}`).join("\n");
  const cmdEn = a.commands.map((p, i) => `${i + 1}. /${p.cmd.name} — ${p.cmd.en} ← Effect: ${isTask ? "execute this operation over the brief while keeping outputs consistent." : "apply this visual operation to the subject while keeping consistency across all outputs."}`).join("\n");

  const neg = buildNegative(a);
  const countNoun = isTask
    ? { ar: count > 1 ? "مخرجات" : "مخرَج", en: count > 1 ? "deliverables" : "deliverable" }
    : { ar: count > 1 ? "صور" : "صورة", en: count > 1 ? "images" : "image" };

  const sections: PromptSection[] = [
    {
      h: { ar: isTask ? "المساعد الموصى به" : "النموذج الموصى به", en: isTask ? "Recommended assistant" : "Recommended model" },
      body: {
        ar: `ابدأ التنفيذ على: ${top.name} (${top.ar}) — ملاءمة ${top.pct}%.\nسبب الاختيار: ${topReason.ar}.\nبدائل قوية إن لم يتوفر: ${altModels}.`,
        en: `Run this on: ${top.name} — ${top.pct}% fit.\nWhy: ${topReason.en}.\nStrong fallbacks if unavailable: ${altModels}.`,
      },
    },
    {
      h: { ar: "الشخصية (Persona)", en: "Persona" },
      body: {
        ar: `يتقمص المساعد دور: ${persona.ar}.\nأنت تنفذ موجزًا دقيقًا — لا ترتجل خارج الحدود التالية.`,
        en: `You are ${persona.en}, executing a precise brief — not improvising beyond the boundaries below.`,
      },
    },
    {
      h: { ar: "المطلوب (Task)", en: "Task" },
      body: {
        ar: `تنفيذ ${count > 1 ? `سلسلة من ${count} ${countNoun.ar} مترابطة` : `${countNoun.ar} واحد متكامل`} لـ${a.subjectAr ? `«${a.subjectAr}»` : "الموضوع الموصوف في الطلب"} ضمن مجال: ${a.cats.map((c) => c.title).join(" + ")}.\nكل التفاصيل التالية إلزامية وليست اقتراحات.`,
        en: `Produce ${count > 1 ? `a coherent series of ${count} ${countNoun.en}` : `one complete ${countNoun.en}`} for ${subjectEn}.\nDomain: ${a.cats.map((c) => c.en).join(" + ")}.\nEvery detail below is mandatory, not suggestive.`,
      },
    },
    {
      h: { ar: "مجموعة الأوامر (Command Stack)", en: "Command stack" },
      body: { ar: `التركيبة: ${a.stackLine}\n\n${cmdAr}`, en: `Stack: ${a.stackLine}\n\n${cmdEn}` },
    },
    {
      h: { ar: "المخرجات النهائية المحددة", en: "Exact final outputs" },
      body: isTask ? {
        ar: `• العدد: ${count} ${countNoun.ar} — ${a.features.countNote.ar}\n• صيغة التسليم: ${ratio} (${a.features.ratioNote.en})\n• الجودة: بلا حشو، بلا placeholders (TODO/lorem)، عناوين وهيكل واضح\n• اللغة: طابق لغة الطلب الأصلي\n• إن تضمنت أرقامًا أو حقائق: وثّق المصدر بجانبها`,
        en: `• Count: ${count} ${countNoun.en} — ${a.features.countNote.en}\n• Delivery format: ${ratio}\n• Quality: zero filler, zero placeholders (TODO/lorem), clear headings & structure\n• Language: match the client's language\n• Any numbers or facts must carry their source inline`,
      } : {
        ar: `• العدد: ${count} ${countNoun.ar} — ${a.features.countNote.ar}\n• الأبعاد: ${ratio} (${a.features.ratioNote.ar})\n• الدقة: 4K (3840×2160) أو أعلى، تفاصيل حادة، بلا artifacts\n• الصيغة: PNG/JPG عالية الجودة${a.features.consistency ? "\n• الاتساق: هوية بصرية واحدة (وجه/منتج/ألوان) ثابتة عبر كل الصور" : ""}`,
        en: `• Count: ${count} ${countNoun.en} — ${a.features.countNote.en}\n• Aspect ratio: ${ratio} (${a.features.ratioNote.en})\n• Resolution: 4K (3840×2160) or higher, crisp detail, zero artifacts\n• Format: high-quality PNG/JPG${a.features.consistency ? "\n• Consistency: one visual identity (face/product/colors) held constant across all images" : ""}`,
      },
    },
    {
      h: { ar: "ضبط الهلوسة (Hallucination Guardrails)", en: "Hallucination guardrails" },
      body: isTask ? {
        ar: `السقف المحدد: ${halluc.ar}\n• لا تخترع مصادر أو إحصاءات أو اقتباسات.\n• إن لم تتأكد من معلومة: صرّح بعدم التأكد بدل اختراعها.\n• لا تخرج عن نطاق الطلب.\n• Negative: ${neg}`,
        en: `Ceiling: ${halluc.en}\n• Never fabricate sources, statistics, or quotes.\n• If unsure, state uncertainty instead of inventing.\n• Stay strictly within the brief's scope.\n• Negative: ${neg}`,
      } : {
        ar: `السقف المحدد: ${halluc.ar}\n• لا تضف عناصر غير مذكورة في البرومبت.\n${a.features.text ? "• النص المكتوب حرفيًا فقط — بلا حروف زائدة أو أخطاء إملائية.\n" : "• لا تكتب أي نص أو أرقام داخل الصورة إلا إذا طُلب صراحة.\n"}• دقة فيزيائية/تشريحية/هندسية: نسب صحيحة، اتصالات ميكانيكية منطقية.\n• Negative prompt: ${neg}`,
        en: `Ceiling: ${halluc.en}\n• Add nothing that is not mentioned in this prompt.\n${a.features.text ? "• Render text exactly as specified — no extra letters, no typos.\n" : "• Render no text or numerals inside the image unless explicitly requested.\n"}• Physical/anatomical/engineering accuracy: correct proportions, logical mechanical connections.\n• Negative prompt: ${neg}`,
      },
    },
  ];

  const enBits: string[] = [];
  enBits.push(`[RECOMMENDED ${isTask ? "AGENT" : "ENGINE"}: ${top.name} | Fit ${top.pct}% | Fallbacks: ${altModels}]`);
  enBits.push(`You are ${persona.en}.`);
  enBits.push(isTask
    ? `Produce ${count > 1 ? `${count} coherent ${countNoun.en}` : `one complete ${countNoun.en}`} for ${subjectEn}.`
    : `Create ${count > 1 ? `${count} coherent images` : "one image"} of ${subjectEn}.`);
  enBits.push(`Execute this command stack in order: ${ops}.`);
  if (isTask) {
    enBits.push(`Deliver in ${ratio}. Language: match the client's language.`);
    enBits.push(`Be exhaustive yet concise; zero placeholders, zero invented facts, sources cited inline.`);
  } else {
    if (a.commands.some((p) => ["lighting", "art", "photo", "cinematic"].includes(p.catId)))
      enBits.push(a.commands.filter((p) => ["lighting", "art", "photo", "cinematic"].includes(p.catId)).map((p) => p.cmd.en).join(", ") + ".");
    enBits.push(`Aspect ratio ${ratio}, 4K+, ultra-detailed, professional-grade, physically accurate, coherent composition.`);
    if (a.features.text) enBits.push(`Render text exactly as specified in the brief — typographically flawless.`);
    else enBits.push(`No text or numerals inside the image unless explicitly requested.`);
  }
  enBits.push(`Strictly avoid: ${neg}.`);
  enBits.push(`Client brief: "${a.userText}"`);

  return {
    kind: a.kind,
    title: a.subjectAr
      ? { ar: `برومبت «${a.subjectAr}»`, en: `Prompt: ${a.subjectEn}` }
      : { ar: "البرومبت النهائي", en: "Final prompt" },
    meta: { model: top.name, stack: a.stackLine, count, ratio: { ar: ratio, en: ratio }, halluc, hallucPct },
    sections,
    paste: enBits.join(" "),
  };
}

function buildNegative(a: Analysis): string {
  if (a.kind === "task") {
    const neg = ["fabricated sources", "invented statistics", "hallucinated citations", "placeholder text (TODO/lorem)", "off-topic filler"];
    const topCat = a.cats[0]?.id ?? "";
    if (topCat === "coding") neg.push("unrunnable code", "deprecated APIs");
    if (topCat === "bizops") neg.push("unverified financial/legal claims");
    if (topCat === "data") neg.push("misleading chart scales");
    return neg.join(", ");
  }
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
  { label: { ar: "بورتريه سينمائي", en: "Cinematic portrait" }, text: { ar: "بورتريه سينمائي لامرأة تحت المطر بإضاءة نيون وعمق ميدان ضحل", en: "Cinematic portrait of a woman in the rain with neon lighting and shallow depth of field" } },
  { label: { ar: "صلّح كود بايثون", en: "Fix Python code" }, text: { ar: "عندي سكربت بايثون يطلع خطأ في التعامل مع الملفات، صلحه واكتب اختبارات وحدة", en: "My Python script throws a file-handling error — fix it and write unit tests" } },
  { label: { ar: "بحث موثق", en: "Cited research" }, text: { ar: "ابحث عن أحدث تطورات الطاقة الشمسية مع مصادر موثوقة ولخص النتائج", en: "Research the latest solar-energy developments with credible sources and summarize" } },
  { label: { ar: "خطة عمل", en: "Business plan" }, text: { ar: "اكتب خطة عمل لمقهى متخصص مع نموذج مالي مبسط واستراتيجية تسعير", en: "Write a business plan for a specialty café with a simple financial model and pricing strategy" } },
  { label: { ar: "مقال SEO", en: "SEO article" }, text: { ar: "اكتب مقال عن الذكاء الاصطناعي في التعليم محسّن للسيو مع عناوين جذابة", en: "Write an SEO-optimized article on AI in education with compelling headlines" } },
  { label: { ar: "تنظيف بيانات", en: "Data cleaning" }, text: { ar: "نظف ملف CSV فيه قيم ناقصة واقترح رسومًا بيانية مناسبة للعرض", en: "Clean a CSV with missing values and suggest the right charts for presentation" } },
  { label: { ar: "ترجمة احترافية", en: "Pro translation" }, text: { ar: "ترجم نص العقد إلى الإنجليزية ترجمة احترافية مع مسرد مصطلحات", en: "Translate the contract text into professional English with a glossary of terms" } },
  { label: { ar: "ترميم صورة", en: "Photo restoration" }, text: { ar: "أريد ترميم وتلوين صورة عائلية قديمة مع تحسين الدقة", en: "Restore and colorize an old family photo with resolution enhancement" } },
  { label: { ar: "إصلاح كود بايثون", en: "Debug Python" }, text: { ar: "أريد إصلاح خطأ في سكريبت بايثون وكتابة اختبارات وحدة له", en: "Debug a Python script and generate unit tests for it" } },
  { label: { ar: "بحث موثق", en: "Cited research" }, text: { ar: "أريد بحثًا موثقًا بالمصادر عن أحدث اتجاهات الذكاء الاصطناعي", en: "Research the latest AI trends with cited sources" } },
  { label: { ar: "مقال SEO", en: "SEO article" }, text: { ar: "اكتب مقالًا تسويقيًا محسّنًا لمحركات البحث عن السيارات الكهربائية", en: "Write an SEO-friendly marketing article about electric cars" } },
  { label: { ar: "تحليل بيانات", en: "Data analysis" }, text: { ar: "حلّل بيانات مبيعات شهرية من ملف Excel واقترح داشبورد مؤشرات", en: "Analyze monthly sales data from an Excel file and propose a KPI dashboard" } },
  { label: { ar: "خطة دراسة", en: "Study plan" }, text: { ar: "ضع لي خطة مذاكرة أسبوعية لامتحان مع بطاقات استذكار", en: "Build a weekly study plan for an exam with flashcards" } },
];

export const DECLINE_CHIPS: Bi[] = [
  { ar: "نفّذها بأسلوب أنمي ياباني", en: "Make it Japanese anime style" },
  { ar: "اجعلها 4 صور مربعة 1:1", en: "Make it 4 square 1:1 images" },
  { ar: "أضف إضاءة غروب ذهبية", en: "Add golden-hour lighting" },
  { ar: "أريدها بدون أي نصوص داخل الصورة", en: "No text inside the image" },
  { ar: "بدّل النموذج الأنسب إلى Midjourney", en: "Switch the model to Midjourney" },
];

export { ALL_COMMANDS, MACROS, CORE64, CATEGORIES, MODELS, TASK_ENGINES };
