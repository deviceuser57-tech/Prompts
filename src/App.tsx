import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ALL_COMMANDS, CATEGORIES, CORE64, MACROS, MODELS } from "./data/commands";
import { analyze, buildPrompt, commandInfo, isCommandQuery, SUGGESTIONS } from "./lib/engine";
import type { Msg } from "./types";
import { MessageView, TypingRow, useAutoScroll } from "./components/Chat";
import { Library } from "./components/Library";
import { Icon } from "./components/Icons";

const LS_KEY = "basar.chat.v2";
const TYPING_LABELS = ["أراجع طلبك مراجعة سريعة…", "أفحص القاموس (250+ أمر بصري)…", "أقارن 8 نماذج توليد…", "أركّب تركيبة الأوامر…", "أضبط سقف الهلوسة…"];

function uid() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function greetingMsg(): Msg {
  return {
    id: uid(), role: "assistant", kind: "text", ts: Date.now(),
    text: "أهلًا بك! أنا «مُحرّك البصر» — مساعد الأوامر البصرية.\nأكتب طلبك بالعربي أو الإنجليزي، وسأقوم فورًا بـ:\n\n1. مراجعة سريعة لطلبك وتحديد أنسب نموذج توليد صور من بين 8 نماذج.\n2. اقتراح أوامر الـ Slash المناسبة مع النتيجة المتوقعة من كل أمر.\n3. وإذا أردت، أحوّل كل ما ناقشناه إلى برومبت احترافي شامل: الشخصية، المطلوب، تركيبة الأوامر، المخرجات النهائية المحددة، سقف الهلوسة، وعدد الصور.\n\nجرّب أحد الاقتراحات بالأسفل، أو افتح /cutaway من شريط الأوامر لترى كيف أشرح أي أمر.",
  };
}

export default function App() {
  const [msgs, setMsgs] = useState<Msg[]>(() => {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Msg[];
        if (Array.isArray(parsed) && parsed.length) return parsed;
      }
    } catch { /* ignore */ }
    return [greetingMsg()];
  });
  const [typing, setTyping] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [tab, setTab] = useState<"chat" | "lib">("chat");
  const timers = useRef<number[]>([]);
  const labelIdx = useRef(0);

  const scrollRef = useAutoScroll([msgs.length, typing]);

  useEffect(() => {
    try { localStorage.setItem(LS_KEY, JSON.stringify(msgs.slice(-40))); } catch { /* ignore */ }
  }, [msgs]);

  useEffect(() => () => { timers.current.forEach(clearTimeout); }, []);

  // تدوير مؤشر الكتابة
  useEffect(() => {
    if (!typing) return;
    const iv = window.setInterval(() => {
      labelIdx.current = (labelIdx.current + 1) % TYPING_LABELS.length;
      setTyping(TYPING_LABELS[labelIdx.current]);
    }, 900);
    return () => clearInterval(iv);
  }, [typing !== null]);

  const push = useCallback((m: Msg) => setMsgs((p) => [...p, m]), []);

  const withTyping = useCallback((delay: number, fn: () => void) => {
    labelIdx.current = 0;
    setTyping(TYPING_LABELS[0]);
    const t = window.setTimeout(() => { setTyping(null); fn(); }, delay);
    timers.current.push(t);
  }, []);

  const respond = useCallback((userText: string) => {
    const text = userText.trim();
    const delay = 950 + Math.min(1400, text.length * 14);

    // استعلام أمر مباشر: /cutaway أو /a + /b
    if (isCommandQuery(text)) {
      const names = [...text.toLowerCase().matchAll(/\/([a-z0-9]+)/g)].map((m) => m[1]);
      const macro = MACROS.find((m) => {
        const set = new Set(m.combo.toLowerCase().split("+").map((s) => s.trim().replace("/", "")));
        return set.size === names.length && names.every((n) => set.has(n));
      });
      withTyping(delay, () => {
        if (macro) {
          push({
            id: uid(), role: "assistant", kind: "text", ts: Date.now(),
            text: `تركيبة معروفة من مكتبة الماكروهات:\n${macro.combo}\n\nالنتيجة المتوقعة: ${macro.result}.\n\nأرسلها كطلب وسأحللها وأرشّح النموذج المناسب:`,
            chips: [`استخدم ${macro.combo} في طلب`],
          });
        } else {
          const info = commandInfo(names[0]);
          if (info) push({ id: uid(), role: "assistant", kind: "command", ts: Date.now(), cmdInfo: info });
          else push({ id: uid(), role: "assistant", kind: "text", ts: Date.now(), text: "لم أجد هذا الأمر في القاموس. جرّب البحث في لوحة «القاموس البصري» أو اكتب طلبك بلغة طبيعية وسأستخرج الأوامر بنفسي." });
        }
      });
      return;
    }

    // تحية قصيرة
    if (/^(مرحبا|اهلا|أهلا|السلام عليكم|هاي|hi|hello|صباح الخير|مساء الخير|ازيك|كيفك|شكرا)/.test(text.toLowerCase()) && text.length < 25) {
      withTyping(700, () => push({ id: uid(), role: "assistant", kind: "text", ts: Date.now(), text: "أهلًا بك! اكتب طلبك البصري وسأراجعه فورًا — مثلًا: «بوستر لمهرجان جاز بإضاءة نيون» أو اكتب أمرًا مباشرة مثل /isometric." }));
      return;
    }

    // دمج مع آخر تحليل لم يُحسم بعد (تحسين تدريجي)
    const last = msgs[msgs.length - 1];
    const base = last && last.kind === "analysis" && last.answered !== "yes" && last.analysis ? `${text} · ${last.analysis.userText}` : text;

    const a = analyze(base);
    if (!a) {
      withTyping(delay, () => push({
        id: uid(), role: "assistant", kind: "text", ts: Date.now(),
        text: "لم أحدّد مجالًا بصريًا واضحًا في طلبك بعد. ساعدني بإحدى هذه الطرق:\n\n• اذكر نوع المخرج: بوستر؟ مخطط؟ صورة واقعية؟ انفوجرافيك؟\n• اذكر الموضوع: سيارة، قلب بشري، فيلا، براند قهوة…\n• أو اكتب أمرًا مباشرًا مثل /cutaway + /dimensioned\n\nأو اختر اقتراحًا جاهزًا:",
        chips: SUGGESTIONS.slice(0, 4).map((s) => s.text),
      }));
      return;
    }
    withTyping(delay, () => push({ id: uid(), role: "assistant", kind: "analysis", ts: Date.now(), analysis: a }));
  }, [msgs, push, withTyping]);

  const send = useCallback((raw: string) => {
    const text = raw.trim();
    if (!text || typing) return;
    push({ id: uid(), role: "user", kind: "text", ts: Date.now(), text });
    setDraft("");
    respond(text);
  }, [push, respond, typing]);

  const acceptAnalysis = useCallback((msgId: string) => {
    const target = msgs.find((m) => m.id === msgId);
    if (!target?.analysis) return;
    setMsgs((p) => p.map((m) => (m.id === msgId ? { ...m, answered: "yes" as const } : m)));
    withTyping(1600, () => push({ id: uid(), role: "assistant", kind: "prompt", ts: Date.now(), prompt: buildPrompt(target.analysis!) }));
  }, [msgs, push, withTyping]);

  const declineAnalysis = useCallback((msgId: string) => {
    setMsgs((p) => p.map((m) => (m.id === msgId ? { ...m, answered: "no" as const } : m)));
    withTyping(900, () => push({
      id: uid(), role: "assistant", kind: "text", ts: Date.now(),
      text: "تمام — قل لي ما الذي تريد تغييره وسأعيد المراجعة. أمثلة سريعة:",
      chips: ["نفّذها بأسلوب أنمي ياباني", "اجعلها 4 صور مربعة 1:1", "أضف إضاءة غروب ذهبية", "أريدها بدون أي نصوص داخل الصورة", "بدّل النموذج الأنسب إلى Midjourney"],
    }));
  }, [push, withTyping]);

  const askCommand = useCallback((name: string) => send(`/${name.replace(/^\//, "")}`), [send]);
  const useStack = useCallback((stack: string) => send(`اعمل لي: ${stack}`), [send]);
  const resetChat = useCallback(() => {
    timers.current.forEach(clearTimeout);
    setTyping(null);
    setMsgs([greetingMsg()]);
    setTab("chat");
  }, []);

  const stats = useMemo(() => [
    { k: "أمر بصري", v: `${ALL_COMMANDS.length}+` },
    { k: "فئة", v: String(CATEGORIES.length) },
    { k: "نموذج", v: String(MODELS.length) },
    { k: "Core", v: String(CORE64.size) },
  ], []);

  const coreList = useMemo(() => ALL_COMMANDS.filter((c) => CORE64.has(c.name)).map((c) => c.name), []);

  return (
    <div className="h-full flex flex-col relative overflow-hidden">
      {/* طبقات الخلفية */}
      <div className="absolute inset-0 bg-blueprint" />
      <div className="glow-amber" /><div className="glow-teal" />
      <div className="noise" />
      <span className="glyph" style={{ top: "18%", left: "6%", animationDelay: "-3s" }}>/isometric</span>
      <span className="glyph" style={{ top: "64%", left: "3%", animationDelay: "-7s" }}>/cutaway + /dimensioned</span>
      <span className="glyph" style={{ top: "34%", left: "44%", animationDelay: "-5s" }}>/goldenhour</span>
      <span className="glyph" style={{ top: "80%", left: "38%", animationDelay: "-9s" }}>/blueprint</span>
      <span className="glyph" style={{ top: "12%", left: "70%", animationDelay: "-2s" }}>/storyboard</span>
      <span className="glyph hidden lg:block" style={{ top: "55%", left: "94%", animationDelay: "-6s" }}>/anatomy</span>

      {/* الترويسة */}
      <header className="relative z-10 px-4 lg:px-6 pt-4 pb-3 flex items-center gap-3">
        <div className="grid place-items-center w-11 h-11 rounded-xl bg-gradient-to-br from-amber to-coral text-deep shadow-[0_6px_24px_rgba(242,163,60,0.35)]">
          <Icon name="aperture" className="w-7 h-7" strokeWidth={1.7} />
        </div>
        <div className="leading-tight">
          <h1 className="font-display font-extrabold text-xl lg:text-2xl tracking-tight">
            قاموس <span className="text-amber">البصر</span>
          </h1>
          <p className="text-[10.5px] text-dim font-mono dir-ltr text-right">Visual Codewords · Slash-Command Engineer</p>
        </div>

        <div className="mr-auto hidden md:flex items-center gap-2">
          {stats.map((s) => (
            <div key={s.k} className="rounded-lg border border-line bg-panel/70 px-3 py-1.5 text-center">
              <p className="font-display font-bold text-sm text-teal leading-none">{s.v}</p>
              <p className="text-[9px] text-dim mt-0.5">{s.k}</p>
            </div>
          ))}
        </div>

        <button onClick={resetChat} className="btn-press inline-flex items-center gap-1.5 rounded-lg border border-line bg-panel/70 px-3 py-2 text-[11.5px] text-mute hover:text-coral hover:border-coral/50">
          <Icon name="refresh" className="w-3.5 h-3.5" /> جلسة جديدة
        </button>
      </header>

      {/* شريط Core 64 المتحرك */}
      <div className="relative z-10 mx-4 lg:mx-6 mb-3 rounded-lg border border-line bg-panel/50 overflow-hidden">
        <div className="flex items-center">
          <span className="shrink-0 z-10 flex items-center gap-1.5 px-3 py-2 text-[10px] font-bold text-amber border-l border-line bg-panel">
            <Icon name="layers" className="w-3.5 h-3.5" /> Core 64
          </span>
          <div className="relative flex-1 overflow-hidden py-2" dir="ltr">
            <div className="ticker-track flex w-max gap-1.5 px-2">
              {[0, 1].map((dup) => (
                <div key={dup} className="flex gap-1.5" aria-hidden={dup === 1}>
                  {coreList.map((n) => (
                    <button key={`${dup}-${n}`} onClick={() => { setTab("chat"); askCommand(n); }} className="chip-cmd font-mono text-[10px] text-teal/80 rounded border border-line/70 bg-deep/40 px-2 py-0.5">
                      /{n}
                    </button>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* الجسم */}
      <main className="relative z-10 flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_400px] gap-3 px-4 lg:px-6 pb-3">
        {/* الشات */}
        <section className={`min-h-0 flex-col rounded-xl border border-line bg-deep/55 overflow-hidden ${tab === "chat" ? "flex" : "hidden lg:flex"}`}>
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 lg:p-5 space-y-5">
            {msgs.map((m) => (
              <MessageView
                key={m.id} msg={m}
                onAccept={() => acceptAnalysis(m.id)}
                onDecline={() => declineAnalysis(m.id)}
                onCmd={askCommand}
                onUse={useStack}
                onNew={() => setDraft("")}
                onChip={send}
              />
            ))}
            {typing && <TypingRow label={typing} />}
          </div>

          {/* اقتراحات */}
          <div className="px-4 pt-2 flex gap-1.5 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {SUGGESTIONS.map((s) => (
              <button key={s.text} onClick={() => send(s.text)} className="chip-cmd shrink-0 rounded-full border border-line bg-panel/70 px-3 py-1.5 text-[11px] text-mute hover:text-amberhi hover:border-amber/50">
                {s.label}
              </button>
            ))}
          </div>

          {/* كاتب الرسالة */}
          <div className="p-3.5">
            <form
              onSubmit={(e) => { e.preventDefault(); send(draft); }}
              className="flex items-end gap-2 rounded-xl border border-line bg-panel/80 p-2 focus-within:border-teal/60 transition-colors shadow-[0_8px_30px_rgba(0,0,0,0.25)]"
            >
              <textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(draft); }
                }}
                rows={1}
                placeholder="اكتب طلبك… مثال: انفوجرافيك عن الذكاء الاصطناعي بأسلوب ايزومتري، أو اكتب /cutaway"
                className="flex-1 resize-none bg-transparent text-[13px] leading-relaxed placeholder:text-dim px-2 py-2 max-h-32 text-ink"
                style={{ height: "auto", minHeight: "40px" }}
                onInput={(e) => { const t = e.currentTarget; t.style.height = "auto"; t.style.height = Math.min(128, t.scrollHeight) + "px"; }}
              />
              <button
                type="submit"
                disabled={!draft.trim() || !!typing}
                className="btn-press grid place-items-center w-10 h-10 shrink-0 rounded-lg bg-amber text-deep disabled:opacity-35 disabled:cursor-not-allowed hover:bg-amberhi shadow-[0_4px_16px_rgba(242,163,60,0.35)]"
                aria-label="إرسال"
              >
                <Icon name="send" className="w-4.5 h-4.5 -scale-x-100" strokeWidth={2} />
              </button>
            </form>
            <p className="text-[9.5px] text-dim mt-2 px-1 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-good blink" />
              محرك تحليل محلي يعمل في متصفحك — مبني على مصفوفة توافق {MODELS.length} نماذج × {ALL_COMMANDS.length}+ أمر بصري، وفق أحدث ممارسات Prompt Engineering.
            </p>
          </div>
        </section>

        {/* المكتبة */}
        <aside className={`min-h-0 ${tab === "lib" ? "block" : "hidden lg:block"}`}>
          <Library onAsk={(t) => { setTab("chat"); send(t); }} onRequestCommand={(n) => { setTab("chat"); askCommand(n); }} />
        </aside>
      </main>

      {/* تبويبات الموبايل */}
      <nav className="lg:hidden relative z-10 grid grid-cols-2 gap-2 px-4 pb-3">
        <button onClick={() => setTab("chat")} className={`btn-press flex items-center justify-center gap-2 rounded-lg border py-2.5 text-[12.5px] font-semibold ${tab === "chat" ? "border-amber/60 bg-amber/15 text-amberhi" : "border-line bg-panel/70 text-mute"}`}>
          <Icon name="chat" className="w-4 h-4" /> الشات
        </button>
        <button onClick={() => setTab("lib")} className={`btn-press flex items-center justify-center gap-2 rounded-lg border py-2.5 text-[12.5px] font-semibold ${tab === "lib" ? "border-teal/60 bg-teal/15 text-teal" : "border-line bg-panel/70 text-mute"}`}>
          <Icon name="book" className="w-4 h-4" /> القاموس
        </button>
      </nav>
    </div>
  );
}
