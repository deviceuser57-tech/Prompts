import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type Locale = "ar" | "en";

const ar = {
  appName: "قاموس البصر", appTag: "Visual Codewords · Slash-Command Engineer",
  newSession: "جلسة جديدة", core: "Core 64",
  sCmd: "أمر بصري", sCat: "فئة", sModel: "نموذج", sCore: "Core",
  chatTab: "الشات", libTab: "القاموس",
  sendPh: "اكتب طلبك… مثال: انفوجرافيك عن الذكاء الاصطناعي بأسلوب ايزومتري، أو اكتب /cutaway",
  engineNote: "محرك تحليل محلي يعمل في متصفحك — مصفوفة توافق 8 نماذج × 250+ أمر بصري، وفق أحدث ممارسات Prompt Engineering.",
  greet: "أهلًا بك! أنا «مُحرّك البصر» — مساعد الأوامر البصرية.\nاكتب طلبك بالعربي أو الإنجليزي، وسأقوم فورًا بـ:\n\n1. مراجعة سريعة لطلبك وتحديد أنسب نموذج توليد صور من بين 8 نماذج.\n2. اقتراح أوامر الـ Slash المناسبة مع النتيجة المتوقعة من كل أمر.\n3. وإذا أردت، أحوّل كل ما ناقشناه إلى برومبت احترافي شامل: الشخصية، المطلوب، تركيبة الأوامر، المخرجات النهائية المحددة، سقف الهلوسة، وعدد الصور.\n\nجرّب أحد الاقتراحات بالأسفل، أو افتح /cutaway لترى كيف أشرح أي أمر.",
  hiReply: "أهلًا بك! اكتب طلبك البصري وسأراجعه فورًا — مثلًا: «بوستر لمهرجان جاز بإضاءة نيون» أو اكتب أمرًا مباشرة مثل /isometric.",
  unknown: "لم أحدّد مجالًا بصريًا واضحًا في طلبك بعد. ساعدني بإحدى هذه الطرق:\n\n• اذكر نوع المخرج: بوستر؟ مخطط؟ صورة واقعية؟ انفوجرافيك؟\n• اذكر الموضوع: سيارة، قلب بشري، فيلا، براند قهوة…\n• أو اكتب أمرًا مباشرًا مثل /cutaway + /dimensioned\n\nأو اختر اقتراحًا جاهزًا:",
  macroKnown: "تركيبة معروفة من مكتبة الماكروهات", macroResult: "النتيجة المتوقعة", macroHint: "أرسلها كطلب وسأحللها وأرشّح النموذج المناسب:",
  macroUse: "استخدم هذه التركيبة في طلب", notFound: "لم أجد هذا الأمر في القاموس. جرّب البحث في لوحة «القاموس البصري» أو اكتب طلبك بلغة طبيعية وسأستخرج الأوامر بنفسي.",
  declineTitle: "تمام — قل لي ما الذي تريد تغييره وسأعيد المراجعة. أمثلة سريعة:",
  reviewTitle: "مراجعة سريعة لطلبك",
  sec1: "أنسب نموذج لتنفيذ المطلوب", bestBadge: "الأنسب", reco: "التوصية الأولى للتنفيذ", fit: "ملاءمة", why: "لأن", alts: "بدائل قوية",
  sec2: "الأوامر والنتيجة المتوقعة", expectOn: "النتيجة المتوقعة على", cmdHint: "اضغط أي أمر لفتح بطاقته من القاموس مع مصفوفة التوافق الكاملة.",
  sec3: "البرومبت النهائي",
  offer: "هل أحوّل كل ما سبق إلى برومبت احترافي شامل؟ (الشخصية + المطلوب + تركيبة الأوامر + المخرجات النهائية + سقف الهلوسة + عدد الصور)",
  accept: "نعم، اكتب البرومبت النهائي", decline: "لا، أريد التعديل أولًا",
  accepted: "تم — جهّزت لك البرومبت الاحترافي في الأسفل.", declined: "تمام، خذ وقتك. اكتب تعديلك وسأعيد المراجعة فورًا.",
  ready: "جاهز للتنفيذ", finalPrompt: "البرومبت النهائي",
  metaModel: "النموذج", metaCount: "عدد الصور", metaRatio: "الأبعاد", metaHalluc: "سقف الهلوسة", metaStack: "الأوامر", ops: "عمليات",
  recEngine: "النموذج الموصى به", startHere: "ابدأ من هنا",
  pasteTitle: "الكتلة الجاهزة للصق (English)", copyFull: "نسخ البرومبت كاملًا", copyPaste: "نسخ الكتلة الإنجليزية", copied: "نُسخ",
  dlFull: "تنزيل المواصفة الكاملة (.txt)", dlPaste: "تنزيل", downloaded: "نُزّل", newReq: "طلب جديد",
  libTitle: "القاموس البصري", libSub: "كل الأوامر بمصفوفة توافق 8 نماذج", libSearch: "ابحث عن أمر بصري…",
  allCats: "الكل", coreOnly: "Core 64 فقط", askSlash: "اسأل عنه في الشات", useInChat: "استخدمه في طلب",
  matrix: "مصفوفة التوافق عبر النماذج:", macrosT: "ماكروهات جاهزة للدمج:", relatedTo: "اسم مرتبط بـ", relatedNote: "أعرض لك الأمر الأساسي.",
  catLbl: "الفئة", fnLbl: "الوظيفة", cmdsCount: "أوامر",
  close: "إغلاق", you: "أنت", userNote: "طلب مُرسَل للمراجعة", botName: "مُحرّك البصر", botNote: "يحلّل · يقارن · يركّب البرومبت",
  dark: "غامق", light: "فاتح",
};
const en: typeof ar = {
  appName: "Basar Codewords", appTag: "Visual Codewords · Slash-Command Engineer",
  newSession: "New session", core: "Core 64",
  sCmd: "commands", sCat: "categories", sModel: "models", sCore: "Core",
  chatTab: "Chat", libTab: "Dictionary",
  sendPh: "Type your request… e.g. an isometric infographic about AI, or just type /cutaway",
  engineNote: "Local analysis engine running in your browser — a compatibility matrix of 8 models × 250+ visual commands, following the latest Prompt Engineering practices.",
  greet: "Welcome! I'm the Basar Engine — your visual-command copilot.\nDescribe what you need in Arabic or English, and I will instantly:\n\n1. Run a quick review and pick the best image model out of 8.\n2. Suggest the right slash commands with the expected result of each.\n3. On request, turn everything we discussed into a full professional prompt: persona, task, command stack, exact final outputs, hallucination ceiling, and image count.\n\nTry a suggestion below, or type /cutaway to see how I explain any command.",
  hiReply: "Welcome! Describe your visual request and I'll review it immediately — e.g. \"a poster for a jazz festival with neon lighting\", or type a command like /isometric.",
  unknown: "I couldn't detect a clear visual domain in your request yet. Help me with one of these:\n\n• Name the output type: poster? diagram? photorealistic image? infographic?\n• Name the subject: a car, a human heart, a villa, a coffee brand…\n• Or type a direct command like /cutaway + /dimensioned\n\nOr pick a ready suggestion:",
  macroKnown: "A known combo from the macros library", macroResult: "Expected result", macroHint: "Send it as a request and I'll analyze it and pick the best model:",
  macroUse: "Use this combo in a request", notFound: "Command not found in the dictionary. Try searching the Dictionary panel, or describe your request in plain language and I'll extract the commands myself.",
  declineTitle: "Sure — tell me what to change and I'll re-review. Quick examples:",
  reviewTitle: "Quick review of your request",
  sec1: "Best model for this task", bestBadge: "Best fit", reco: "Primary recommendation", fit: "Fit", why: "because", alts: "Strong fallbacks",
  sec2: "Commands & expected results", expectOn: "Expected result on", cmdHint: "Click any command to open its dictionary card with the full compatibility matrix.",
  sec3: "Final prompt",
  offer: "Shall I turn everything above into a full professional prompt? (Persona + Task + Command stack + Exact outputs + Hallucination ceiling + Image count)",
  accept: "Yes, write the final prompt", decline: "No, let me refine first",
  accepted: "Done — the professional prompt is ready below.", declined: "Sure, take your time. Type your refinement and I'll re-review instantly.",
  ready: "Ready to execute", finalPrompt: "Final prompt",
  metaModel: "Model", metaCount: "Image count", metaRatio: "Aspect", metaHalluc: "Hallucination", metaStack: "Commands", ops: "ops",
  recEngine: "Recommended model", startHere: "Start here",
  pasteTitle: "Paste-ready block (English)", copyFull: "Copy full prompt", copyPaste: "Copy English block", copied: "Copied",
  dlFull: "Download full spec (.txt)", dlPaste: "Download", downloaded: "Saved", newReq: "New request",
  libTitle: "Visual Dictionary", libSub: "Every command with an 8-model compatibility matrix", libSearch: "Search a visual command…",
  allCats: "All", coreOnly: "Core 64 only", askSlash: "Ask in chat", useInChat: "Use in a request",
  matrix: "Compatibility matrix across models:", macrosT: "Ready-to-stack macros:", relatedTo: "Alias of", relatedNote: "showing you the primary command.",
  catLbl: "Category", fnLbl: "Function", cmdsCount: "cmds",
  close: "Close", you: "You", userNote: "Request sent for review", botName: "Basar Engine", botNote: "Analyzes · Compares · Stacks prompts",
  dark: "Dark", light: "Light",
};

export type TKey = keyof typeof ar;
const DICT = { ar, en };

interface Ctx {
  locale: Locale;
  setLocale: (l: Locale) => void;
  theme: "dark" | "light";
  setTheme: (t: "dark" | "light") => void;
  t: (k: TKey) => string;
  L: <T>(bi: { ar: T; en: T }) => T;
}
const AppCtx = createContext<Ctx | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(() => (localStorage.getItem("basar.locale") === "en" ? "en" : "ar"));
  const [theme, setThemeState] = useState<"dark" | "light">(() => (localStorage.getItem("basar.theme") === "light" ? "light" : "dark"));

  useEffect(() => {
    const root = document.documentElement;
    root.dataset.theme = theme;
    localStorage.setItem("basar.theme", theme);
  }, [theme]);
  useEffect(() => {
    const root = document.documentElement;
    root.lang = locale;
    root.dir = locale === "ar" ? "rtl" : "ltr";
    localStorage.setItem("basar.locale", locale);
  }, [locale]);

  const value: Ctx = {
    locale,
    setLocale: (l) => setLocaleState(l),
    theme,
    setTheme: (th) => setThemeState(th),
    t: (k) => DICT[locale][k],
    L: (bi) => bi[locale],
  };
  return <AppCtx.Provider value={value}>{children}</AppCtx.Provider>;
}

export function useApp(): Ctx {
  const ctx = useContext(AppCtx);
  if (!ctx) throw new Error("useApp outside provider");
  return ctx;
}
