import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type Locale = "ar" | "en";

const ar = {
  appName: "مُحرّك الأوامر", appNameHi: "الأوامر", appTag: "Visual + Task Commands · Prompt Studio",
  kindAll: "الكل", kindVisual: "بصري", kindTask: "مهام", tickerLbl: "أوامر مميزة",
  newSession: "جلسة جديدة", core: "Core 64",
  sCmd: "أمر بصري", sCat: "فئة", sModel: "نموذج", sCore: "Core",
  chatTab: "الشات", libTab: "المكتبة",
  sendPh: "اكتب طلبك أو أرفق ملفًا بأي صيغة… مثال: حلّل هذا الـ CSV، أو اكتب /cutaway",
  engineNote: "محرك تحليل محلي في متصفحك — مصفوفتا توافق: 8 نماذج صور × الأوامر البصرية و8 مساعدات مهام × أوامر المهام، مع تحليل الملفات المرفقة. وفق أحدث ممارسات Prompt Engineering.",
  greet: "أهلًا بك! أنا «مُحرّك الأوامر» — مساعد الأوامر البصرية وأوامر المهام.\nاكتب طلبك بالعربي أو الإنجليزي، وسأقوم فورًا بـ:\n\n1. مراجعة سريعة لطلبك وتحديد الأنسب للتنفيذ: نموذج توليد صور أو مساعد ذكاء للمهام.\n2. اقتراح أوامر الـ Slash المناسبة مع النتيجة المتوقعة من كل أمر.\n3. وإذا أردت، أحوّل كل ما ناقشناه إلى برومبت احترافي شامل: الشخصية، المطلوب، تركيبة الأوامر، المخرجات النهائية المحددة، سقف الهلوسة، وعدد المخرجات.\n\nجرّب أحد الاقتراحات بالأسفل، أو افتح /cutaway لترى كيف أشرح أي أمر.",
  hiReply: "أهلًا بك! اكتب طلبك البصري وسأراجعه فورًا — مثلًا: «بوستر لمهرجان جاز بإضاءة نيون» أو اكتب أمرًا مباشرة مثل /isometric.",
  unknown: "لم أحدّد مجالًا بصريًا واضحًا في طلبك بعد. ساعدني بإحدى هذه الطرق:\n\n• اذكر نوع المخرج: بوستر؟ مخطط؟ صورة واقعية؟ انفوجرافيك؟\n• اذكر الموضوع: سيارة، قلب بشري، فيلا، براند قهوة…\n• أو اكتب أمرًا مباشرًا مثل /cutaway + /dimensioned\n\nأو اختر اقتراحًا جاهزًا:",
  macroKnown: "تركيبة معروفة من مكتبة الماكروهات", macroResult: "النتيجة المتوقعة", macroHint: "أرسلها كطلب وسأحللها وأرشّح النموذج المناسب:",
  macroUse: "استخدم هذه التركيبة في طلب", notFound: "لم أجد هذا الأمر في المكتبة. جرّب البحث في «مكتبة الأوامر» أو اكتب طلبك بلغة طبيعية وسأستخرج الأوامر بنفسي.",
  declineTitle: "تمام — قل لي ما الذي تريد تغييره وسأعيد المراجعة. أمثلة سريعة:",
  reviewTitle: "مراجعة سريعة لطلبك",
  sec1: "أنسب نموذج لتنفيذ المطلوب", bestBadge: "الأنسب", reco: "التوصية الأولى للتنفيذ", fit: "ملاءمة", why: "لأن", alts: "بدائل قوية",
  sec2: "الأوامر والنتيجة المتوقعة", expectOn: "النتيجة المتوقعة على", cmdHint: "اضغط أي أمر لفتح بطاقته من القاموس مع مصفوفة التوافق الكاملة.",
  sec3: "البرومبت النهائي",
  offer: "هل أحوّل كل ما سبق إلى برومبت احترافي شامل؟ (قاعدة الثبات + الشخصية + تركيبة الأوامر + المواصفات البصرية + سقف الهلوسة + عدد الصور)",
  offerT: "هل أحوّل كل ما سبق إلى بروتوكول تنفيذ احترافي؟ (قاعدة الثبات + الشخصية + تركيبة الأوامر + مستويات الدليل + مواصفات التسليم + سقف الهلوسة + جدول النتائج)",
  accept: "نعم، اكتب البرومبت النهائي", decline: "لا، أريد التعديل أولًا",
  accepted: "تم — جهّزت لك البرومبت الاحترافي في الأسفل.", declined: "تمام، خذ وقتك. اكتب تعديلك وسأعيد المراجعة فورًا.",
  ready: "جاهز للتنفيذ", finalPrompt: "البرومبت النهائي",
  metaModel: "النموذج", metaCount: "عدد الصور", metaRatio: "الأبعاد", metaHalluc: "سقف الهلوسة", metaStack: "الأوامر", ops: "عمليات",
  recEngine: "النموذج الموصى به", startHere: "ابدأ من هنا",
  pasteTitle: "الكتلة الجاهزة للصق (English)", copyFull: "نسخ البرومبت كاملًا", copyPaste: "نسخ الكتلة الإنجليزية", copied: "نُسخ",
  dlFull: "تنزيل المواصفة الكاملة (.txt)", dlPaste: "تنزيل", downloaded: "نُزّل", newReq: "طلب جديد",
  libTitle: "مكتبة الأوامر", libSub: "أوامر بصرية ومهام — بمصفوفات توافق النماذج والمساعدات", libSearch: "ابحث عن أمر بصري أو أمر مهام…",
  allCats: "الكل", coreOnly: "Core 64 فقط", askSlash: "اسأل عنه في الشات", useInChat: "استخدمه في طلب",
  matrix: "مصفوفة التوافق عبر النماذج:", macrosT: "ماكروهات جاهزة للدمج:", relatedTo: "اسم مرتبط بـ", relatedNote: "أعرض لك الأمر الأساسي.",
  catLbl: "الفئة", fnLbl: "الوظيفة", cmdsCount: "أوامر",
  close: "إغلاق", you: "أنت", userNote: "طلب مُرسَل للمراجعة", botName: "مُحرّك الأوامر", botNote: "بصري + مهام · برومبت شامل",
  dark: "غامق", light: "فاتح",
  sec1t: "أنسب مساعد ذكاء لتنفيذ المطلوب",
  taskBadge: "مهمة", visualBadge: "بصري", otherAxis: "فئة مساندة من المحور الآخر",
  matrixT: "مصفوفة التوافق عبر مساعدات الذكاء:",
  metaCountT: "عدد المخرجات", metaRatioT: "صيغة التسليم",
  attach: "إرفاق ملفات", dropHere: "أفلت الملفات هنا", dropSub: "صور · مستندات · كود · صوت · فيديو · أي نوع",
  removeFile: "إزالة الملف", fileGone: "معاينة غير متاحة بعد إعادة التحميل", filesAttached: "ملف مرفق",
  filesInMsg: "مرفقات", openImage: "عرض الصورة", scanFiles: "أفحص الملفات المرفقة…",
};
const en: typeof ar = {
  appName: "Command Engine", appNameHi: "Engine", appTag: "Visual + Task Commands · Prompt Studio",
  kindAll: "All", kindVisual: "Visual", kindTask: "Tasks", tickerLbl: "Featured commands",
  newSession: "New session", core: "Core 64",
  sCmd: "commands", sCat: "categories", sModel: "models", sCore: "Core",
  chatTab: "Chat", libTab: "Library",
  sendPh: "Type your request or attach any file… e.g. analyze this CSV, or type /cutaway",
  engineNote: "Local analysis engine in your browser — two compatibility matrices: 8 image models × visual commands and 8 task assistants × task commands, plus attached-file analysis. Following the latest Prompt Engineering practices.",
  greet: "Welcome! I'm the Command Engine — your visual & task command copilot.\nDescribe what you need in Arabic or English, and I will instantly:\n\n1. Run a quick review and pick the best executor: an image model or a task AI assistant.\n2. Suggest the right slash commands with the expected result of each.\n3. On request, turn everything we discussed into a full professional prompt: persona, task, command stack, exact final outputs, hallucination ceiling, and deliverable count.\n\nTry a suggestion below, or type /cutaway to see how I explain any command.",
  hiReply: "Welcome! Describe your visual request and I'll review it immediately — e.g. \"a poster for a jazz festival with neon lighting\", or type a command like /isometric.",
  unknown: "I couldn't detect a clear visual domain in your request yet. Help me with one of these:\n\n• Name the output type: poster? diagram? photorealistic image? infographic?\n• Name the subject: a car, a human heart, a villa, a coffee brand…\n• Or type a direct command like /cutaway + /dimensioned\n\nOr pick a ready suggestion:",
  macroKnown: "A known combo from the macros library", macroResult: "Expected result", macroHint: "Send it as a request and I'll analyze it and pick the best model:",
  macroUse: "Use this combo in a request", notFound: "Command not found in the library. Try searching the Command Library, or describe your request in plain language and I'll extract the commands myself.",
  declineTitle: "Sure — tell me what to change and I'll re-review. Quick examples:",
  reviewTitle: "Quick review of your request",
  sec1: "Best model for this task", bestBadge: "Best fit", reco: "Primary recommendation", fit: "Fit", why: "because", alts: "Strong fallbacks",
  sec2: "Commands & expected results", expectOn: "Expected result on", cmdHint: "Click any command to open its dictionary card with the full compatibility matrix.",
  sec3: "Final prompt",
  offer: "Shall I turn everything above into a full professional prompt? (Lock rule + Persona + Command stack + Visual specs + Hallucination ceiling + Image count)",
  offerT: "Shall I turn everything above into a professional execution protocol? (Lock rule + Persona + Command stack + Evidence levels + Delivery specs + Hallucination ceiling + Results table)",
  accept: "Yes, write the final prompt", decline: "No, let me refine first",
  accepted: "Done — the professional prompt is ready below.", declined: "Sure, take your time. Type your refinement and I'll re-review instantly.",
  ready: "Ready to execute", finalPrompt: "Final prompt",
  metaModel: "Model", metaCount: "Image count", metaRatio: "Aspect", metaHalluc: "Hallucination", metaStack: "Commands", ops: "ops",
  recEngine: "Recommended model", startHere: "Start here",
  pasteTitle: "Paste-ready block (English)", copyFull: "Copy full prompt", copyPaste: "Copy English block", copied: "Copied",
  dlFull: "Download full spec (.txt)", dlPaste: "Download", downloaded: "Saved", newReq: "New request",
  libTitle: "Command Library", libSub: "Visual & task commands — with model and assistant compatibility matrices", libSearch: "Search a visual or task command…",
  allCats: "All", coreOnly: "Core 64 only", askSlash: "Ask in chat", useInChat: "Use in a request",
  matrix: "Compatibility matrix across models:", macrosT: "Ready-to-stack macros:", relatedTo: "Alias of", relatedNote: "showing you the primary command.",
  catLbl: "Category", fnLbl: "Function", cmdsCount: "cmds",
  close: "Close", you: "You", userNote: "Request sent for review", botName: "Command Engine", botNote: "Visual + tasks · full prompts",
  dark: "Dark", light: "Light",
  sec1t: "Best AI assistant for this task",
  taskBadge: "Task", visualBadge: "Visual", otherAxis: "Supporting category from the other axis",
  matrixT: "Compatibility across AI assistants:",
  metaCountT: "Deliverables", metaRatioT: "Delivery format",
  attach: "Attach files", dropHere: "Drop files here", dropSub: "Images · Docs · Code · Audio · Video · any type",
  removeFile: "Remove file", fileGone: "Preview unavailable after reload", filesAttached: "attached file(s)",
  filesInMsg: "Attachments", openImage: "View image", scanFiles: "Scanning attached files…",
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

function readLS(k: string): string | null { try { return localStorage.getItem(k); } catch { return null; } }
function writeLS(k: string, v: string) { try { localStorage.setItem(k, v); } catch { /* ignore */ } }

export function AppProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(() => (readLS("basar.locale") === "en" ? "en" : "ar"));
  const [theme, setThemeState] = useState<"dark" | "light">(() => (readLS("basar.theme") === "light" ? "light" : "dark"));

  useEffect(() => {
    const root = document.documentElement;
    root.dataset.theme = theme;
    writeLS("basar.theme", theme);
  }, [theme]);
  useEffect(() => {
    const root = document.documentElement;
    root.lang = locale;
    root.dir = locale === "ar" ? "rtl" : "ltr";
    writeLS("basar.locale", locale);
    document.title = locale === "en" ? "Command Engine — Visual & Task Prompt Studio" : "مُحرّك الأوامر — Visual & Task Prompt Studio";
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
