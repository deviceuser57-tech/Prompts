import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import gsap from "gsap";
import { ALL_COMMANDS, CATEGORIES, CORE64, MACROS, MODELS } from "./data/commands";
import { analyze, buildPrompt, commandInfo, isCommandQuery, SUGGESTIONS, DECLINE_CHIPS } from "./lib/engine";
import { AppProvider, useApp } from "./lib/i18n";
import type { Msg } from "./types";
import { MessageView, TypingRow, useAutoScroll } from "./components/Chat";
import { Library } from "./components/Library";
import { SessionTray } from "./components/SessionTray";
import { Icon } from "./components/Icons";
import { createSession, getSession, loadSessions, saveSessions, updateSession, uid as storageUid } from "./lib/storage";

const LS_KEY = "basar.chat.v3";
const LS_CURRENT = "basar.currentSession";
const LS_LEGACY = "basar.legacyLoaded";
const RM = typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const TYPING_AR = ["أراجع طلبك مراجعة سريعة…", "أفحص القاموس (250+ أمر بصري)…", "أقارن 8 نماذج توليد…", "أركّب تركيبة الأوامر…", "أضبط سقف الهلوسة…"];
const TYPING_EN = ["Running a quick review…", "Scanning the dictionary (250+ commands)…", "Comparing 8 generation models…", "Stacking the commands…", "Tuning the hallucination ceiling…"];

function uid() {
  return storageUid();
}

function greetingMsg(locale: "ar" | "en"): Msg {
  return {
    id: uid(), role: "assistant", kind: "text", ts: Date.now(),
    text: locale === "ar"
      ? "أهلًا بك! أنا «مُحرّك البصر» — مساعد الأوامر البصرية.\nاكتب طلبك بالعربي أو الإنجليزي، وسأقوم فورًا بـ:\n\n1. مراجعة سريعة لطلبك وتحديد أنسب نموذج توليد صور من بين 8 نماذج.\n2. اقتراح أوامر الـ Slash المناسبة مع النتيجة المتوقعة من كل أمر.\n3. وإذا أردت، أحوّل كل ما ناقشناه إلى برومبت احترافي شامل: الشخصية، المطلوب، تركيبة الأوامر، المخرجات النهائية المحددة، سقف الهلوسة، وعدد الصور.\n\nجرّب أحد الاقتراحات بالأسفل، أو افتح /cutaway من شريط الأوامر لترى كيف أشرح أي أمر."
      : "Welcome! I'm the Basar Engine — your visual-command copilot.\nDescribe what you need in Arabic or English, and I will instantly:\n\n1. Run a quick review and pick the best image model out of 8.\n2. Suggest the right slash commands with the expected result of each.\n3. On request, turn everything we discussed into a full professional prompt: persona, task, command stack, exact final outputs, hallucination ceiling, and image count.\n\nTry a suggestion below, or click /cutaway on the ticker to see how I explain any command.",
  };
}

const FLOATING_CMDS = [
  { cmd: "/isometric", style: { top: "16%", left: "5%", animationDelay: "0s" }, d: 26 },
  { cmd: "/cutaway + /dimensioned", style: { top: "62%", left: "3%" }, d: 40 },
  { cmd: "/goldenhour", style: { top: "34%", left: "42%" }, d: 18 },
  { cmd: "/blueprint", style: { top: "78%", left: "36%" }, d: 32 },
  { cmd: "/storyboard", style: { top: "10%", left: "68%" }, d: 22 },
  { cmd: "/anatomy", style: { top: "52%", left: "92%" }, d: 36 },
  { cmd: "/neon", style: { top: "88%", left: "72%" }, d: 28 },
];

function Shell() {
  const { locale, setLocale, theme, setTheme, t, L } = useApp();

  // تهيئة الجلسة الحالية
  const [sessionId, setSessionId] = useState<string | null>(() => {
    try { return localStorage.getItem(LS_CURRENT); } catch { return null; }
  });
  const [msgs, setMsgs] = useState<Msg[]>(() => {
    const sid = (() => { try { return localStorage.getItem(LS_CURRENT); } catch { return null; } })();
    const sess = sid ? getSession(sid) : null;
    if (sess && sess.msgs.length) return sess.msgs;
    // ترحيل البيانات القديمة مرة واحدة
    try {
      if (!localStorage.getItem(LS_LEGACY)) {
        const raw = localStorage.getItem(LS_KEY);
        localStorage.setItem(LS_LEGACY, "1");
        if (raw) {
          const parsed = JSON.parse(raw) as Msg[];
          if (Array.isArray(parsed) && parsed.length) return parsed;
        }
      }
    } catch { /* ignore */ }
    return [greetingMsg(locale)];
  });
  const [typing, setTyping] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [tab, setTab] = useState<"chat" | "lib">("chat");
  const [sessions, setSessions] = useState(() => loadSessions());
  const timers = useRef<number[]>([]);
  const labelIdx = useRef(0);
  const rootRef = useRef<HTMLDivElement>(null);

  const scrollRef = useAutoScroll([msgs.length, typing]);
  const typingLabels = locale === "ar" ? TYPING_AR : TYPING_EN;

  // حفظ الجلسة عند تغيّر الرسائل
  useEffect(() => {
    const sid = sessionId;
    if (!sid) {
      try { localStorage.setItem(LS_KEY, JSON.stringify(msgs.slice(-40))); } catch { /* ignore */ }
      return;
    }
    const all = loadSessions();
    const idx = all.findIndex((s) => s.id === sid);
    const upd = { ...(all[idx] ?? { id: sid, title: t("newSession"), createdAt: Date.now() }), updatedAt: Date.now(), msgs: msgs.slice(-80) };
    if (idx >= 0) all[idx] = upd; else all.unshift(upd);
    saveSessions(all);
    setSessions(all);
  }, [msgs, sessionId, t]);

  useEffect(() => {
    try { localStorage.setItem(LS_CURRENT, sessionId ?? ""); } catch { /* ignore */ }
  }, [sessionId]);
  useEffect(() => () => { timers.current.forEach(clearTimeout); }, []);

  /* GSAP: المقدمة + أوامر عائمة + بارالاكس */
  useEffect(() => {
    const ctx = gsap.context(() => {
      if (!RM) {
        const tl = gsap.timeline({ defaults: { ease: "power3.out" } });
        tl.from("header > *", { y: -18, opacity: 0, duration: 0.6, stagger: 0.07 })
          .from(".ticker-wrap", { opacity: 0, y: -10, duration: 0.5 }, "-=0.3")
          .from(".panel-main", { opacity: 0, y: 26, duration: 0.7, stagger: 0.1 }, "-=0.35")
          .from(".glyph", { opacity: 0, duration: 1.2, stagger: 0.12 }, "-=0.5");
        gsap.utils.toArray<HTMLElement>(".glyph").forEach((g) => {
          gsap.to(g, { y: "random(-14, 14)", x: "random(-8, 8)", duration: "random(4, 7)", yoyo: true, repeat: -1, ease: "sine.inOut", delay: Math.random() * 2 });
        });
      }
      const glyphs = gsap.utils.toArray<HTMLElement>(".glyph");
      const quick = glyphs.map((g) => ({
        x: gsap.quickTo(g, "x", { duration: 0.8, ease: "power2.out" }),
        y: gsap.quickTo(g, "y", { duration: 0.8, ease: "power2.out" }),
        d: Number(g.dataset.d || 20),
      }));
      const onMove = (e: MouseEvent) => {
        const nx = (e.clientX / window.innerWidth - 0.5) * 2;
        const ny = (e.clientY / window.innerHeight - 0.5) * 2;
        quick.forEach((qk) => { qk.x(nx * qk.d); qk.y(ny * qk.d); });
      };
      if (!RM) window.addEventListener("mousemove", onMove);
      return () => window.removeEventListener("mousemove", onMove);
    }, rootRef);
    return () => ctx.revert();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!typing) return;
    const iv = window.setInterval(() => {
      labelIdx.current = (labelIdx.current + 1) % typingLabels.length;
      setTyping(typingLabels[labelIdx.current]);
    }, 900);
    return () => clearInterval(iv);
  }, [typing !== null, locale]);

  const push = useCallback((m: Msg) => setMsgs((p) => [...p, m]), []);
  const withTyping = useCallback((delay: number, fn: () => void) => {
    labelIdx.current = 0;
    setTyping(typingLabels[0]);
    const tm = window.setTimeout(() => { setTyping(null); fn(); }, RM ? Math.min(delay, 300) : delay);
    timers.current.push(tm);
  }, [typingLabels]);

  const respond = useCallback((userText: string) => {
    const text = userText.trim();
    const delay = 950 + Math.min(1400, text.length * 14);

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
            text: locale === "ar"
              ? `${t("macroKnown")}:\n${macro.combo}\n\n${t("macroResult")}: ${macro.ar}.\n\n${t("macroHint")}`
              : `${t("macroKnown")}:\n${macro.combo}\n\n${t("macroResult")}: ${macro.en}.\n\n${t("macroHint")}`,
            chips: [locale === "ar" ? t("macroUse") : t("macroUse")],
          });
        } else {
          const info = commandInfo(names[0]);
          if (info) push({ id: uid(), role: "assistant", kind: "command", ts: Date.now(), cmdInfo: info });
          else push({ id: uid(), role: "assistant", kind: "text", ts: Date.now(), text: t("notFound") });
        }
      });
      return;
    }

    const lower = text.toLowerCase();
    if (/^(مرحبا|اهلا|أهلا|السلام عليكم|هاي|hi|hello|hey|صباح الخير|مساء الخير|ازيك|كيفك|شكرا)/.test(lower) && text.length < 25) {
      withTyping(700, () => push({ id: uid(), role: "assistant", kind: "text", ts: Date.now(), text: t("hiReply") }));
      return;
    }

    const last = msgs[msgs.length - 1];
    const base = last && last.kind === "analysis" && last.answered !== "yes" && last.analysis ? `${text} · ${last.analysis.userText}` : text;

    const a = analyze(base);
    if (!a) {
      withTyping(delay, () => push({
        id: uid(), role: "assistant", kind: "text", ts: Date.now(),
        text: t("unknown"),
        chips: SUGGESTIONS.slice(0, 4).map((s) => L(s.text)),
      }));
      return;
    }
    withTyping(delay, () => push({ id: uid(), role: "assistant", kind: "analysis", ts: Date.now(), analysis: a }));
  }, [msgs, push, withTyping, locale, t, L]);

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
      text: t("declineTitle"),
      chips: DECLINE_CHIPS.map((c) => L(c)),
    }));
  }, [push, withTyping, t, L]);

  const askCommand = useCallback((name: string) => {
    const clean = name.trim();
    send(clean.startsWith("/") ? clean : `/${clean}`);
  }, [send]);
  const useStack = useCallback((stack: string) => send(locale === "ar" ? `اعمل لي: ${stack}` : `Do this: ${stack}`), [send, locale]);

  /* -------- إدارة الجلسات -------- */
  const newSession = useCallback(() => {
    timers.current.forEach(clearTimeout);
    setTyping(null);
    const s = createSession();
    setSessionId(s.id);
    setMsgs([greetingMsg(locale)]);
    setTab("chat");
    setSessions(loadSessions());
  }, [locale]);

  const openSession = useCallback((id: string) => {
    if (id === "__none__") {
      setSessionId(null);
      setMsgs([greetingMsg(locale)]);
      setTab("chat");
      return;
    }
    const s = getSession(id);
    if (!s) return;
    timers.current.forEach(clearTimeout);
    setTyping(null);
    setSessionId(s.id);
    setMsgs(s.msgs.length ? s.msgs : [greetingMsg(locale)]);
    setTab("chat");
  }, [locale]);

  const resetChat = useCallback(() => {
    timers.current.forEach(clearTimeout);
    setTyping(null);
    setMsgs([greetingMsg(locale)]);
    setTab("chat");
  }, [locale]);

  // استيراد من JSON (يستدعيها SessionTray عبر window)
  useEffect(() => {
    (window as any).__basarImport = (arr: Msg[]) => {
      timers.current.forEach(clearTimeout);
      setTyping(null);
      const s = createSession();
      setSessionId(s.id);
      setMsgs(arr.length ? arr : [greetingMsg(locale)]);
      setTab("chat");
      setSessions(loadSessions());
    };
    return () => { delete (window as any).__basarImport; };
  }, [locale]);

  const stats = useMemo(() => [
    { k: t("sCmd"), v: `${ALL_COMMANDS.length}+` },
    { k: t("sCat"), v: String(CATEGORIES.length) },
    { k: t("sModel"), v: String(MODELS.length) },
    { k: t("sCore"), v: String(CORE64.size) },
  ], [t]);

  const coreList = useMemo(() => ALL_COMMANDS.filter((cm) => CORE64.has(cm.name)).map((cm) => cm.name), []);

  return (
    <div ref={rootRef} className="h-full flex flex-col relative overflow-hidden">
      {/* طبقات الخلفية */}
      <div className="absolute inset-0 bg-blueprint" />
      <div className="glow-amber" /><div className="glow-teal" />
      <div className="noise" />
      {FLOATING_CMDS.map((g) => (
        <span key={g.cmd} className="glyph" data-d={g.d} style={g.style}>{g.cmd}</span>
      ))}

      {/* الترويسة */}
      <header className="relative z-10 px-4 lg:px-6 pt-4 pb-3 flex items-center gap-3">
        <div className="grid place-items-center w-11 h-11 rounded-xl bg-gradient-to-br from-amber to-coral text-deep shadow-[0_6px_24px_rgba(242,163,60,0.35)]">
          <Icon name="aperture" className="w-7 h-7" strokeWidth={1.7} />
        </div>
        <div className="leading-tight">
          <h1 className="font-display font-extrabold text-xl lg:text-2xl tracking-tight">
            {locale === "ar" ? <>قاموس <span className="text-amber">البصر</span></> : <>Basar <span className="text-amber">Codewords</span></>}
          </h1>
          <p className="text-[10.5px] text-dim font-mono dir-ltr text-start">{t("appTag")}</p>
        </div>

        <div className="ms-auto hidden md:flex items-center gap-2">
          {stats.map((s) => (
            <div key={s.k} className="glass rounded-lg px-3 py-1.5 text-center">
              <p className="font-display font-bold text-sm text-teal leading-none">{s.v}</p>
              <p className="text-[9px] text-dim mt-0.5">{s.k}</p>
            </div>
          ))}
        </div>

        <div className="relative flex items-center gap-1.5 ms-auto md:ms-2">
          {/* الجلسات */}
          <SessionTray
            sessions={sessions}
            currentId={sessionId}
            onOpen={openSession}
            onNew={newSession}
            msgs={msgs}
          />
          {/* لغة */}
          <button
            onClick={() => setLocale(locale === "ar" ? "en" : "ar")}
            className="btn-press inline-flex items-center gap-1.5 glass rounded-lg px-3 py-2 text-[11.5px] font-semibold text-mute hover:text-teal hover:border-teal/50"
            title={locale === "ar" ? "Switch to English" : "التبديل إلى العربية"}
          >
            <Icon name="globe" className="w-4 h-4" />
            <span className="font-mono dir-ltr">{locale === "ar" ? "EN" : "ع"}</span>
          </button>
          {/* ثيم */}
          <button
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="btn-press inline-flex items-center gap-1.5 glass rounded-lg px-3 py-2 text-[11.5px] font-semibold text-mute hover:text-amber hover:border-amber/50"
            title={theme === "dark" ? t("light") : t("dark")}
          >
            <Icon name={theme === "dark" ? "sun" : "moon"} className="w-4 h-4" />
          </button>
          <button onClick={newSession} className="btn-press inline-flex items-center gap-1.5 glass rounded-lg px-3 py-2 text-[11.5px] text-mute hover:text-coral hover:border-coral/50">
            <Icon name="refresh" className="w-3.5 h-3.5" /> <span className="hidden sm:inline">{t("newSession")}</span>
          </button>
        </div>
      </header>

      {/* شريط Core 64 */}
      <div className="ticker-wrap relative z-10 mx-4 lg:mx-6 mb-3 glass rounded-lg overflow-hidden">
        <div className="flex items-center">
          <span className="shrink-0 z-10 flex items-center gap-1.5 px-3 py-2 text-[10px] font-bold text-amber border-e border-line bg-panel2/70">
            <Icon name="layers" className="w-3.5 h-3.5" /> {t("core")}
          </span>
          <div className="relative flex-1 overflow-hidden py-2" dir="ltr">
            <div className="ticker-track flex w-max gap-1.5 px-2">
              {[0, 1].map((dup) => (
                <div key={dup} className="flex gap-1.5" aria-hidden={dup === 1}>
                  {coreList.map((n) => (
                    <button key={`${dup}-${n}`} onClick={() => { setTab("chat"); askCommand(n); }} className="chip-cmd font-mono text-[10px] text-teal/80 rounded border border-line/70 bg-panel2/40 px-2 py-0.5 hover:text-teal hover:border-teal/60 transition-colors">
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
        <section className={`panel-main min-h-0 flex-col glass rounded-xl overflow-hidden ${tab === "chat" ? "flex" : "hidden lg:flex"}`}>
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

          <div className="px-4 pt-2 flex gap-1.5 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {SUGGESTIONS.map((s) => (
              <button key={s.text.ar} onClick={() => send(L(s.text))} className="chip-cmd shrink-0 rounded-full glass px-3 py-1.5 text-[11px] text-mute hover:text-amberhi hover:border-amber/50 transition-colors">
                {L(s.label)}
              </button>
            ))}
          </div>

          <div className="p-3.5">
            <form
              onSubmit={(e) => { e.preventDefault(); send(draft); }}
              className="flex items-end gap-2 glass glass-strong rounded-xl p-2 focus-within:border-teal/60 transition-colors shadow-[0_8px_30px_rgba(0,0,0,0.18)]"
            >
              <textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(draft); } }}
                rows={1}
                placeholder={t("sendPh")}
                className="flex-1 resize-none bg-transparent text-[13px] leading-relaxed placeholder:text-dim px-2 py-2 max-h-32 text-ink outline-none"
                style={{ minHeight: "40px" }}
                onInput={(e) => { const el = e.currentTarget; el.style.height = "auto"; el.style.height = Math.min(128, el.scrollHeight) + "px"; }}
              />
              <button
                type="submit"
                disabled={!draft.trim() || !!typing}
                className="btn-press grid place-items-center w-10 h-10 shrink-0 rounded-lg bg-amber text-deep disabled:opacity-35 disabled:cursor-not-allowed hover:bg-amberhi shadow-[0_4px_16px_rgba(242,163,60,0.35)]"
                aria-label={t("chatTab")}
              >
                <Icon name="send" className="w-4.5 h-4.5 rtl:-scale-x-100" strokeWidth={2} />
              </button>
            </form>
            <p className="text-[9.5px] text-dim mt-2 px-1 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-good blink shrink-0" /> {t("engineNote")}
            </p>
          </div>
        </section>

        <aside className={`panel-main relative min-h-0 ${tab === "lib" ? "block" : "hidden lg:block"}`}>
          <Library onAsk={(txt) => { setTab("chat"); send(txt); }} onRequestCommand={(n) => { setTab("chat"); askCommand(n); }} />
        </aside>
      </main>

      <nav className="lg:hidden relative z-10 grid grid-cols-2 gap-2 px-4 pb-3">
        <button onClick={() => setTab("chat")} className={`btn-press flex items-center justify-center gap-2 rounded-lg border py-2.5 text-[12.5px] font-semibold transition-colors ${tab === "chat" ? "border-amber/60 bg-amber/15 text-amberhi" : "glass text-mute"}`}>
          <Icon name="chat" className="w-4 h-4" /> {t("chatTab")}
        </button>
        <button onClick={() => setTab("lib")} className={`btn-press flex items-center justify-center gap-2 rounded-lg border py-2.5 text-[12.5px] font-semibold transition-colors ${tab === "lib" ? "border-teal/60 bg-teal/15 text-teal" : "glass text-mute"}`}>
          <Icon name="book" className="w-4 h-4" /> {t("libTab")}
        </button>
      </nav>
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <Shell />
    </AppProvider>
  );
}
