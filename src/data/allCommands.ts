export interface CommandDef { name: string; fn: string; en: string; r: string; }
const c = (name: string, fn: string, en: string, r: string): CommandDef => ({ name, fn, en, r });

export const MODELS = [
  { id: "gpt", name: "GPT Image", ar: "جي بي تي Image", st: "Instruction following & spec adherence", stAr: "فهم التعليمات والالتزام بالتفاصيل", hue: "#4cc3a5" },
  { id: "gemini", name: "Gemini Image", ar: "جيميناي Image", st: "Reference editing & series consistency", stAr: "تحرير مرجعي وثبات سلاسل الصور", hue: "#6aa5ff" },
  { id: "qwen", name: "Qwen-Image", ar: "كوين Image", st: "Arabic text & balanced performance", stAr: "نصوص عربية وأداء متوازن", hue: "#c792ea" },
  { id: "flux", name: "FLUX", ar: "فلوكس", st: "Photorealism & clean textures", stAr: "واقعية تصويرية وخامات نقية", hue: "#ff8a5c" },
  { id: "midjourney", name: "Midjourney", ar: "ميدجورني", st: "Artistic aesthetics & cinematic framing", stAr: "جماليات فنية وكادرات سينمائية", hue: "#f2d16b" },
  { id: "firefly", name: "Firefly", ar: "فايرفلاي", st: "Commercial-safe & design integration", stAr: "أمان تجاري واندماج تصميمي", hue: "#ff7ab0" },
  { id: "ideogram", name: "Ideogram", ar: "ايديوجرام", st: "Typography & in-image logos", stAr: "تايبوجرافي وشعارات داخل الصورة", hue: "#7fd8f5" },
  { id: "sdxl", name: "SDXL", ar: "إس دي إكس إل", st: "Full control via ControlNet & LoRA", stAr: "تحكم كامل عبر ControlNet وLoRA", hue: "#b8c47a" },
];

/* مساعدات الذكاء العام لمهام غير بصرية — ترتيب التقييم: gpt5, claude, gemini, grok, perplexity, deepseek, qwen, llama */
export const TASK_ENGINES = [
  { id: "gpt5", name: "GPT-5", ar: "جي بي تي 5", st: "Complex multi-step reasoning & tool use", stAr: "استدلال مركب متعدد الخطوات مع أدوات", hue: "#4cc3a5" },
  { id: "claude", name: "Claude Opus", ar: "كلود أوبس", st: "Long-context writing & deep coding", stAr: "كتابة طويلة السياق وبرمجة عميقة", hue: "#c792ea" },
  { id: "gemini", name: "Gemini Pro", ar: "جيميناي برو", st: "Multimodal research, 1M-token context", stAr: "بحث متعدد الوسائط بسياق مليون توكن", hue: "#6aa5ff" },
  { id: "grok", name: "Grok", ar: "جروك", st: "Real-time data & social trends", stAr: "بيانات لحظية واتجاهات اجتماعية", hue: "#f2d16b" },
  { id: "perplexity", name: "Perplexity", ar: "بيربلكستي", st: "Cited research with live sources", stAr: "بحث موثق بمصادر حية", hue: "#7fd8f5" },
  { id: "deepseek", name: "DeepSeek", ar: "ديب سيك", st: "Cost-efficient coding & math", stAr: "برمجة ورياضيات بكفاءة كلفة", hue: "#ff8a5c" },
  { id: "qwen", name: "Qwen-Max", ar: "كوين ماكس", st: "Fluent Arabic & Chinese tasks", stAr: "مهام عربية وصينية بطلاقة", hue: "#ff7ab0" },
  { id: "llama", name: "Llama 4", ar: "لاما 4", st: "Open-source & on-device execution", stAr: "تشغيل مفتوح المصدر ومحلي", hue: "#b8c47a" },
];

export function enginesFor(kind: "visual" | "task") {
  return kind === "task" ? TASK_ENGINES : MODELS;
}

export function ratingLabel(r: string, locale: "ar" | "en" = "ar") {
  if (r === "3") return { rank: 3, label: locale === "ar" ? "قوي جدًا" : "Excellent" };
  if (r === "2") return { rank: 2, label: locale === "ar" ? "جيد" : "Good" };
  return { rank: 1, label: locale === "ar" ? "محدود" : "Limited" };
}

export interface Category { id: string; en: string; title: string; icon: string; kind: "visual" | "task"; keywords: string[]; top: string[]; commands: CommandDef[]; }

/* ============ الفئات البصرية ============ */
const V = (id: string, en: string, title: string, icon: string, keywords: string[], top: string[], commands: CommandDef[]): Category =>
  ({ id, en, title, icon, kind: "visual", keywords, top, commands });
const T = (id: string, en: string, title: string, icon: string, keywords: string[], top: string[], commands: CommandDef[]): Category =>
  ({ id, en, title, icon, kind: "task", keywords, top, commands });

export const CATEGORIES: Category[] = [
