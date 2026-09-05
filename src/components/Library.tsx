import { useEffect, useMemo, useRef, useState } from "react";
import gsap from "gsap";
import { ALL_COMMANDS, CATEGORIES, COMMAND_INDEX, CORE64, MACROS, RELATED, enginesFor, ratingLabel, type CommandDef } from "../data/commands";
import { useApp } from "../lib/i18n";
import { Icon, StatusDot } from "./Icons";

const RM = typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export function Library({ onAsk, onRequestCommand }: { onAsk: (text: string) => void; onRequestCommand: (name: string) => void }) {
  const { t, locale, L } = useApp();
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<string>("all");
  const [coreOnly, setCoreOnly] = useState(false);
  const [sel, setSel] = useState<CommandDef | null>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (sel && modalRef.current) {
      gsap.fromTo(modalRef.current, { y: RM ? 0 : 24, opacity: RM ? 1 : 0, scale: RM ? 1 : 0.97 }, { y: 0, opacity: 1, scale: 1, duration: 0.35, ease: "power3.out" });
    }
  }, [sel]);

  const results = useMemo(() => {
    const nq = q.trim().toLowerCase();
    return ALL_COMMANDS.filter((cm) => {
      if (coreOnly && !CORE64.has(cm.name)) return false;
      if (cat !== "all") {
        const ct = COMMAND_INDEX.get(cm.name)?.cat.id;
        if (ct !== cat) return false;
      }
      if (!nq) return true;
      return cm.name.includes(nq) || cm.fn.includes(nq) || cm.en.toLowerCase().includes(nq) || ("/" + cm.name).includes(nq);
    });
  }, [q, cat, coreOnly]);

  const cats = useMemo(() => {
    const m = new Map<string, number>();
    for (const cm of ALL_COMMANDS) m.set(COMMAND_INDEX.get(cm.name)!.cat.id, (m.get(COMMAND_INDEX.get(cm.name)!.cat.id) ?? 0) + 1);
    return CATEGORIES.map((c) => ({ ...c, n: m.get(c.id) ?? 0 }));
  }, []);

  const selInfo = useMemo(() => {
    if (!sel) return null;
    const hit = COMMAND_INDEX.get(sel.name)!;
    return {
      cat: hit.cat,
      core: CORE64.has(sel.name),
      relatedTo: RELATED[sel.name],
      macros: MACROS.filter((mc) => mc.combo.includes("/" + sel.name)),
    };
  }, [sel]);

  const useCmd = (text: string) => {
    setSel(null);
    onRequestCommand(text);
  };

  return (
    <div className="h-full glass rounded-xl flex flex-col overflow-hidden">
      <div className="p-3.5 border-b border-line glass-top">
        <div className="flex items-center gap-2 mb-2.5">
          <Icon name="book" className="w-4.5 h-4.5 text-teal" />
          <h2 className="font-display font-bold text-[15px]">{t("libTitle")}</h2>
          <span className="ms-auto font-mono text-[10px] text-dim dir-ltr">{results.length} cmd</span>
        </div>
        <p className="text-[10.5px] text-dim -mt-1 mb-2.5">{t("libSub")}</p>
        <div className="flex items-center gap-2 rounded-lg border border-line bg-panel2/60 px-3 focus-within:border-teal/60 transition-colors">
          <Icon name="search" className="w-4 h-4 text-dim shrink-0" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={t("libSearch")}
            className="flex-1 bg-transparent py-2 text-[12.5px] placeholder:text-dim outline-none min-w-0"
          />
          {q && (
            <button onClick={() => setQ("")} className="text-dim hover:text-ink" aria-label="clear">
              <Icon name="close" className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
        <div className="flex items-center gap-2 mt-2.5">
          <div className="flex-1 overflow-x-auto flex gap-1.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <button onClick={() => setCat("all")} className={`shrink-0 rounded-md border px-2.5 py-1 text-[11px] transition-colors ${cat === "all" ? "border-teal/60 bg-teal/15 text-teal font-semibold" : "border-line bg-panel2/50 text-mute hover:text-ink"}`}>
              {t("allCats")}
            </button>
            {cats.map((c) => (
              <button key={c.id} onClick={() => setCat(cat === c.id ? "all" : c.id)} className={`shrink-0 rounded-md border px-2.5 py-1 text-[11px] transition-colors ${cat === c.id ? "border-teal/60 bg-teal/15 text-teal font-semibold" : "border-line bg-panel2/50 text-mute hover:text-ink"}`}>
                {L({ ar: c.title, en: c.en })} <span className="opacity-60">{c.n}</span>
              </button>
            ))}
          </div>
          <button onClick={() => setCoreOnly(!coreOnly)} className={`shrink-0 rounded-md border px-2.5 py-1 text-[11px] font-semibold transition-colors ${coreOnly ? "border-amber/60 bg-amber/15 text-amber" : "border-line bg-panel2/50 text-mute hover:text-ink"}`}>
            {t("coreOnly")}
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-2.5">
        {results.length === 0 && (
          <div className="grid place-items-center h-40 text-center">
            <div>
              <Icon name="search" className="w-8 h-8 text-dim mx-auto mb-2" />
              <p className="text-[12px] text-dim">{locale === "ar" ? "لا نتائج — جرّب كلمة أخرى" : "No results — try another term"}</p>
            </div>
          </div>
        )}
        <div className="space-y-1.5">
          {results.map((cm) => {
            const hit = COMMAND_INDEX.get(cm.name)!;
            const core = CORE64.has(cm.name);
            return (
              <button key={cm.name} onClick={() => setSel(cm)} className="chip-cmd w-full text-start rounded-lg border border-line bg-panel2/30 px-3 py-2.5 flex items-center gap-2.5 hover:border-teal/50 hover:bg-teal/5 transition-colors group">
                <code className="shrink-0 font-mono text-[11.5px] font-semibold text-teal dir-ltr">/{cm.name}</code>
                <span className="flex-1 min-w-0 text-[11.5px] text-mute truncate group-hover:text-ink transition-colors">
                  {L({ ar: cm.fn, en: cm.en })}
                </span>
                {core && <span className="shrink-0 text-[8.5px] border border-amber/50 text-amber rounded px-1 py-0.5 bg-amber/10 font-bold">64</span>}
                <span className="shrink-0 text-[9px] text-dim hidden sm:block">{L({ ar: hit.cat.title, en: hit.cat.en })}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* نافذة تفاصيل */}
      {sel && selInfo && (
        <div className="absolute inset-0 z-20 flex items-end sm:items-center justify-center p-3 sm:p-4 bg-deep/70 backdrop-blur-sm" onClick={() => setSel(null)}>
          <div ref={modalRef} onClick={(e) => e.stopPropagation()} className="glass rounded-xl w-full max-w-md max-h-[85%] overflow-y-auto shadow-[0_24px_80px_rgba(0,0,0,0.45)]">
            <div className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <code className="font-mono font-bold text-teal text-lg dir-ltr">/{sel.name}</code>
                {selInfo.core && <span className="text-[9.5px] border border-amber/50 text-amber rounded px-1.5 py-0.5 bg-amber/10 font-semibold">Core 64</span>}
                <button onClick={() => setSel(null)} className="ms-auto grid place-items-center w-7 h-7 rounded-md border border-line text-mute hover:text-ink" aria-label={t("close")}>
                  <Icon name="close" className="w-4 h-4" />
                </button>
              </div>
              {selInfo.relatedTo && (
                <p className="text-[11.5px] text-mute mb-2">
                  {t("relatedTo")} <code className="font-mono text-teal dir-ltr">/{selInfo.relatedTo}</code> — {t("relatedNote")}
                </p>
              )}
              <p className="text-[10px] text-dim mb-1 flex items-center gap-2">
                {t("catLbl")}: {L({ ar: selInfo.cat.title, en: selInfo.cat.en })}
                <span className={`text-[9px] rounded px-1.5 py-0.5 border ${selInfo.cat.kind === "task" ? "text-coral border-coral/40 bg-coral/10" : "text-teal border-teal/40 bg-teal/10"}`}>
                  {selInfo.cat.kind === "task" ? t("taskBadge") : t("visualBadge")}
                </span>
              </p>
              <p className="text-[13px] leading-relaxed mb-4 font-medium">{L({ ar: sel.fn, en: sel.en })}</p>

              <p className="text-[10.5px] text-dim font-semibold mb-2">{selInfo.cat.kind === "task" ? t("matrixT") : t("matrix")}</p>
              <div className="grid grid-cols-2 gap-1.5 mb-4">
                {enginesFor(selInfo.cat.kind).map((m, i) => {
                  const rl = ratingLabel(sel.r[i], locale);
                  return (
                    <div key={m.id} className="flex items-center gap-2 rounded-md border border-line bg-panel2/40 px-2.5 py-1.5">
                      <StatusDot rank={rl.rank} />
                      <span className="text-[11px] font-medium flex-1 truncate">{locale === "ar" ? m.ar : m.name}</span>
                      <span className="text-[9.5px] text-dim">{rl.label}</span>
                    </div>
                  );
                })}
              </div>

              {selInfo.macros.length > 0 && (
                <>
                  <p className="text-[10.5px] text-dim font-semibold mb-2">{t("macrosT")}</p>
                  <div className="space-y-1.5 mb-4">
                    {selInfo.macros.slice(0, 3).map((m) => (
                      <button key={m.combo} onClick={() => useCmd(m.combo)} className="chip-cmd w-full text-start rounded-md border border-line bg-panel2/40 px-3 py-2 hover:border-teal/50">
                        <code className="font-mono text-[11px] text-teal dir-ltr block">{m.combo}</code>
                        <span className="text-[10.5px] text-mute">{L({ ar: m.ar, en: m.en })}</span>
                      </button>
                    ))}
                  </div>
                </>
              )}

              <div className="flex gap-2">
                <button onClick={() => useCmd(`/${sel.name}`)} className="btn-press flex-1 inline-flex items-center justify-center gap-2 rounded-lg bg-amber text-deep font-display font-bold text-[12.5px] px-3 py-2.5 hover:bg-amberhi shadow-[0_4px_18px_rgba(242,163,60,0.3)]">
                  <Icon name="chat" className="w-4 h-4" /> {t("askSlash")}
                </button>
                <button onClick={() => useCmd(locale === "ar" ? `اعمل لي: /${sel.name}` : `Do this: /${sel.name}`)} className="btn-press flex-1 inline-flex items-center justify-center gap-2 rounded-lg border border-teal/50 bg-teal/10 text-teal font-display font-bold text-[12.5px] px-3 py-2.5 hover:bg-teal/20">
                  <Icon name="send" className="w-4 h-4 -scale-x-100" /> {t("useInChat")}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
