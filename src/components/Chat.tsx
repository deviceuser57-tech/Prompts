import { useEffect, useRef, useState, type ReactNode } from "react";
import gsap from "gsap";
import type { Msg } from "../types";
import type { Analysis, BuiltPrompt, Bi } from "../lib/engine";
import { useApp } from "../lib/i18n";
import { enginesFor, ratingLabel } from "../data/commands";
import { Icon, StatusDot } from "./Icons";

const RM = typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/* ---------------- نسخ وتنزيل ---------------- */
async function copyText(text: string) {
  try { await navigator.clipboard.writeText(text); } catch {
    const ta = document.createElement("textarea");
    ta.value = text; ta.style.position = "fixed"; ta.style.opacity = "0";
    document.body.appendChild(ta); ta.select();
    try { document.execCommand("copy"); } catch { /* ignore */ }
    ta.remove();
  }
}
function download(name: string, content: string) {
  const blob = new Blob(["\uFEFF" + content], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = name; a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1500);
}

function useFlash(timeout = 1800) {
  const [on, setOn] = useState(false);
  const t = useRef<number | null>(null);
  const fire = () => {
    setOn(true);
    if (t.current) window.clearTimeout(t.current);
    t.current = window.setTimeout(() => setOn(false), timeout);
  };
  return { on, fire };
}

function CopyBtn({ text, label, labelDone, small }: { text: string; label: string; labelDone: string; small?: boolean }) {
  const { on, fire } = useFlash();
  return (
    <button
      onClick={async () => { await copyText(text); fire(); }}
      className={`btn-press inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs font-medium transition-colors ${small ? "" : ""} ${on ? "border-good/60 bg-good/15 text-good" : "border-line bg-panel2/60 text-mute hover:text-ink hover:border-teal/50"}`}
    >
      <Icon name={on ? "check" : "copy"} className="w-3.5 h-3.5" strokeWidth={2.2} />
      <span>{on ? labelDone : label}</span>
    </button>
  );
}

function DownloadBtn({ name, content, label, labelDone }: { name: string; content: string; label: string; labelDone: string }) {
  const { on, fire } = useFlash(2200);
  return (
    <button
      onClick={() => { download(name, content); fire(); }}
      className={`btn-press inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs font-medium transition-colors ${on ? "border-good/60 bg-good/15 text-good" : "border-line bg-panel2/60 text-mute hover:text-ink hover:border-teal/50"}`}
    >
      <Icon name={on ? "check" : "download"} className="w-3.5 h-3.5" strokeWidth={2.2} />
      <span>{on ? labelDone : label}</span>
    </button>
  );
}

/* ---------------- دخول الرسائل (GSAP) ---------------- */
function Rise({ children, className }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (ref.current) gsap.fromTo(ref.current, { y: RM ? 0 : 18, opacity: RM ? 1 : 0 }, { y: 0, opacity: 1, duration: 0.5, ease: "power3.out", clearProps: "transform" });
  }, []);
  return <div ref={ref} className={className}>{children}</div>;
}

/* ---------------- رؤوس ---------------- */
function BotHead() {
  const { t } = useApp();
  return (
    <div className="flex items-center gap-2.5 mb-2">
      <div className="relative grid place-items-center w-8 h-8 rounded-lg glass glass-strong text-amber">
        <Icon name="aperture" className="w-5 h-5" strokeWidth={1.6} />
        <span className="absolute -bottom-0.5 -left-0.5 w-2.5 h-2.5 rounded-full bg-teal border-2 border-deep pulse-ring" />
      </div>
      <div className="leading-none">
        <p className="font-display font-bold text-sm">{t("botName")}</p>
        <p className="text-[10px] text-dim mt-1">{t("botNote")}</p>
      </div>
    </div>
  );
}
function UserHead() {
  const { t } = useApp();
  return (
    <div className="flex items-center justify-end gap-2.5 mb-2">
      <div className="leading-none">
        <p className="font-display font-bold text-sm">{t("you")}</p>
        <p className="text-[10px] text-dim mt-1">{t("userNote")}</p>
      </div>
      <div className="grid place-items-center w-8 h-8 rounded-lg glass-strong border border-amber/40 text-amberhi">
        <Icon name="user" className="w-4.5 h-4.5" />
      </div>
    </div>
  );
}

/* ---------------- بطاقة التحليل ---------------- */
function ModelBars({ a }: { a: Analysis }) {
  const { locale, L } = useApp();
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!box.current) return;
    const fills = Array.from(box.current.querySelectorAll<HTMLElement>(".bar-fill"));
    fills.forEach((el) => {
      gsap.fromTo(el, { width: "0%" }, { width: el.dataset.w + "%", duration: RM ? 0 : 0.9, ease: "power2.out", delay: RM ? 0 : 0.15 });
    });
  }, [a]);
  return (
    <div ref={box} className="space-y-3">
      {a.models.map((m, i) => {
        const reason = m.reasons[0] ?? { ar: m.stAr, en: m.st };
        return (
          <div key={m.modelId}>
            <div className="flex items-center justify-between gap-2 mb-1">
              <span className={`font-display text-sm font-bold ${i === 0 ? "text-amberhi" : "text-ink"}`} style={i === 0 ? { textShadow: "0 0 18px rgba(242,163,60,0.35)" } : undefined}>
                {i === 0 && <BestBadge />}
                {locale === "ar" ? m.ar : m.name}
              </span>
              <span className="font-mono text-xs text-mute dir-ltr">{m.pct}%</span>
            </div>
            <div className="h-1.5 rounded-full bg-panel2/80 overflow-hidden">
              <div className="bar-fill h-full rounded-full" data-w={m.pct} style={{ width: "0%", background: `linear-gradient(90deg, ${m.hue}55, ${m.hue})`, boxShadow: `0 0 10px ${m.hue}66` }} />
            </div>
            <p className="text-[11px] text-mute mt-1 leading-relaxed">{L(reason)}</p>
          </div>
        );
      })}
    </div>
  );
}
function BestBadge() {
  const { t } = useApp();
  return <span className="me-1.5 text-[10px] align-middle border border-amber/50 text-amber rounded px-1.5 py-0.5 bg-amber/10">{t("bestBadge")}</span>;
}

function SectionTitle({ n, title }: { n: string; title: string }) {
  return (
    <h4 className="flex items-center gap-2 mb-2.5">
      <span className="grid place-items-center w-6 h-6 min-w-6 rounded-md bg-amber/15 border border-amber/40 text-amber font-display font-bold text-[11px]">{n}</span>
      <span className="font-display font-bold text-[13.5px]">{title}</span>
      <span className="flex-1 h-px bg-line" />
    </h4>
  );
}

function AnalysisCard({ msg, onAccept, onDecline, onCmd }: {
  msg: Msg; onAccept: () => void; onDecline: () => void; onCmd: (name: string) => void;
}) {
  const { t, locale, L } = useApp();
  const a = msg.analysis!;
  const top = a.models[0];
  const done = !!msg.answered;
  const topReason = top.reasons[0] ?? { ar: top.stAr, en: top.st };
  return (
    <div className="glass rounded-xl overflow-hidden">
      <div className="px-4 py-3 border-b border-line glass-top flex items-center gap-2">
        <Icon name="bolt" className="w-4 h-4 text-amber" strokeWidth={2} />
        <h3 className="font-display font-bold text-sm">{t("reviewTitle")}</h3>
        <span className="ms-auto font-mono text-[10px] text-dim dir-ltr truncate max-w-[45%]">{a.stackLine || "—"}</span>
      </div>

      <div className="p-4 space-y-5">
        <p className="text-[13px] leading-relaxed text-ink/90">{L(a.summary)}</p>

        {/* 1) الأنسب للتنفيذ */}
        <section>
          <SectionTitle n="1" title={a.kind === "task" ? t("sec1t") : t("sec1")} />
          {/* بانر التوصية */}
          <div className="mb-3 flex items-center gap-3 rounded-lg border border-amber/45 bg-gradient-to-l from-amber/15 via-amber/5 to-transparent px-3.5 py-3">
            <div className="grid place-items-center w-9 h-9 shrink-0 rounded-lg bg-amber/20 border border-amber/50 text-amber">
              <Icon name="crown" className="w-5 h-5" strokeWidth={1.8} />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] text-amber font-bold mb-0.5">{t("reco")}</p>
              <p className="font-display font-extrabold text-[15px] leading-tight">
                {top.name} <span className="text-mute font-medium text-[11px]">({locale === "ar" ? top.ar : top.name})</span>
              </p>
              <p className="text-[11px] text-mute mt-0.5 leading-relaxed">
                {t("why")} {L(topReason)} · {t("fit")} <span className="font-mono text-good">{top.pct}%</span>
              </p>
            </div>
            <span className="ms-auto hidden sm:block font-display font-extrabold text-2xl text-amber/80 tabular-nums dir-ltr">{top.pct}%</span>
          </div>
          <ModelBars a={a} />
        </section>

        {/* 2) الأوامر */}
        <section>
          <SectionTitle n="2" title={t("sec2")} />
          <div className="space-y-2">
            {a.commands.map((p) => {
              const engines = enginesFor(a.kind);
              const ri = engines.findIndex((m) => m.id === top.modelId);
              const sameAxis = p.catKind === a.kind;
              const rl = sameAxis ? ratingLabel(p.cmd.r[ri], locale) : null;
              return (
                <button key={p.cmd.name} onClick={() => onCmd(p.cmd.name)} className="chip-cmd w-full text-start rounded-lg border border-line bg-panel2/40 px-3 py-2.5 flex items-start gap-3">
                  <code className="shrink-0 font-mono text-[12px] font-semibold text-teal bg-teal/10 border border-teal/30 rounded px-2 py-0.5 dir-ltr mt-0.5">/{p.cmd.name}</code>
                  <span className="flex-1 min-w-0">
                    <span className="block text-[12.5px] text-ink leading-snug">
                      {L({ ar: p.cmd.fn, en: p.cmd.en })}
                      <span className={`ms-2 align-middle text-[9px] rounded px-1.5 py-0.5 border ${p.catKind === "task" ? "text-coral border-coral/40 bg-coral/10" : "text-teal border-teal/40 bg-teal/10"}`}>
                        {p.catKind === "task" ? t("taskBadge") : t("visualBadge")}
                      </span>
                    </span>
                    <span className="block text-[10.5px] text-dim mt-0.5">
                      {sameAxis
                        ? <>{t("expectOn")} {top.name}: {rl!.label}</>
                        : <>{t("otherAxis")}</>}
                      {" · "}{L({ ar: p.catTitle, en: p.catEn })}
                    </span>
                  </span>
                  {rl ? <StatusDot rank={rl.rank} /> : <span className="w-2.5 h-2.5 mt-1 rounded-full border border-dim/50" />}
                </button>
              );
            })}
          </div>
          <p className="text-[10.5px] text-dim mt-2 flex items-center gap-1.5">
            <Icon name="info" className="w-3.5 h-3.5 shrink-0" /> {t("cmdHint")}
          </p>
        </section>

        {/* 3) العرض */}
        <section>
          <SectionTitle n="3" title={t("sec3")} />
          <div className={`rounded-lg border border-dashed p-3.5 transition-colors ${done ? "border-line bg-panel2/30" : "border-amber/50 bg-amber/5"}`}>
            <p className="text-[13px] leading-relaxed">
              {done ? (msg.answered === "yes" ? t("accepted") : t("declined")) : t("offer")}
            </p>
            {!done && (
              <div className="flex flex-wrap gap-2 mt-3">
                <button onClick={onAccept} className="btn-press inline-flex items-center gap-2 rounded-lg bg-amber text-deep font-display font-bold text-sm px-4 py-2 hover:bg-amberhi shadow-[0_4px_20px_rgba(242,163,60,0.35)]">
                  <Icon name="spark" className="w-4 h-4" strokeWidth={2} /> {t("accept")}
                </button>
                <button onClick={onDecline} className="btn-press inline-flex items-center gap-2 rounded-lg border border-line bg-panel2/50 px-4 py-2 text-sm text-mute hover:text-ink hover:border-coral/50">
                  <Icon name="refresh" className="w-4 h-4" /> {t("decline")}
                </button>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

/* ---------------- البرومبت النهائي ---------------- */
export function formatFullSpec(p: BuiltPrompt): string {
  const lines: string[] = [];
  lines.push("═".repeat(46));
  lines.push(p.title.ar + "  |  " + p.title.en);
  lines.push("═".repeat(46));
  lines.push(`المواصفة الكاملة — Full Visual Prompt Specification`);
  lines.push("");
  lines.push(`[الميتا — META]`);
  lines.push(`النموذج الموصى به / Model: ${p.meta.model}`);
  lines.push(`عدد الصور / Image count: ${p.meta.count}`);
  lines.push(`الأبعاد / Aspect ratio: ${p.meta.ratio.ar}`);
  lines.push(`سقف الهلوسة / Hallucination ceiling: ${p.meta.halluc.ar} (${p.meta.halluc.en})`);
  lines.push(`تركيبة الأوامر / Command stack: ${p.meta.stack}`);
  lines.push("");
  lines.push(`[1] الأقسام العربية — ARABIC SECTIONS`);
  lines.push("-".repeat(46));
  p.sections.forEach((s, i) => { lines.push(`${i + 1}) ${s.h.ar}`); lines.push(s.body.ar); lines.push(""); });
  lines.push(`[2] الأقسام الإنجليزية — ENGLISH SECTIONS`);
  lines.push("-".repeat(46));
  p.sections.forEach((s, i) => { lines.push(`${i + 1}) ${s.h.en}`); lines.push(s.body.en); lines.push(""); });
  lines.push(`[3] الكتلة الجاهزة للصق — PASTE-READY BLOCK`);
  lines.push("-".repeat(46));
  lines.push(p.paste);
  return lines.join("\n");
}

function PromptCard({ msg, onNew }: { msg: Msg; onNew: () => void }) {
  const { t, locale, L } = useApp();
  const p = msg.prompt!;
  const [open, setOpen] = useState(true);
  return (
    <div className="glass rounded-xl overflow-hidden border-amber/35 shadow-[0_0_44px_rgba(242,163,60,0.09)]">
      <div className="px-4 py-3 border-b border-line glass-top flex items-center gap-2">
        <Icon name="spark" className="w-4.5 h-4.5 text-amber" strokeWidth={2} />
        <h3 className="font-display font-bold text-sm">{L(p.title)}</h3>
        <span className="ms-auto inline-flex items-center gap-1 text-[10px] font-mono text-good border border-good/40 bg-good/10 rounded px-2 py-0.5">
          <span className="w-1.5 h-1.5 rounded-full bg-good blink" /> {t("ready")}
        </span>
      </div>

      {/* الميتا */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-px bg-line">
        {[
          { k: t("metaModel"), v: p.meta.model, hi: true },
          { k: p.meta.ratio.ar.includes(":") || p.meta.ratio.ar.match(/^\d/) ? t("metaCount") : t("metaCountT"), v: String(p.meta.count) },
          { k: p.meta.ratio.ar.includes(":") || p.meta.ratio.ar.match(/^\d/) ? t("metaRatio") : t("metaRatioT"), v: L(p.meta.ratio) },
          { k: t("metaHalluc"), v: L(p.meta.halluc) },
          { k: t("metaStack"), v: `${p.meta.stack.split("+").length} ${t("ops")}` },
        ].map((m) => (
          <div key={m.k} className={`px-3 py-2.5 ${m.hi ? "bg-amber/12 text-amberhi" : "bg-panel2/50"}`}>
            <p className="text-[9.5px] text-dim mb-1">{m.k}</p>
            <p className={`text-[11.5px] font-semibold leading-tight ${m.hi ? "text-amberhi" : "text-ink"}`}>{m.v}</p>
          </div>
        ))}
      </div>

      <div className="p-4 space-y-3">
        {p.sections.map((s, i) => (
          <div key={i} className={`rounded-lg border bg-panel2/30 overflow-hidden ${i === 0 ? "border-amber/45" : "border-line"}`}>
            <div className="px-3 py-2 flex items-center gap-2 border-b border-line/60">
              {i === 0 && <Icon name="crown" className="w-3.5 h-3.5 text-amber" />}
              <span className={`font-display font-bold text-[12px] ${i === 0 ? "text-amber" : "text-amberhi"}`}>{i + 1}. {L(s.h)}</span>
              {i === 0 && <span className="ms-auto text-[9px] border border-amber/50 text-amber rounded px-1.5 py-0.5 bg-amber/10">{t("startHere")}</span>}
            </div>
            <p className="px-3 py-2.5 text-[12px] leading-relaxed text-ink/85 whitespace-pre-wrap">{L(s.body)}</p>
          </div>
        ))}

        {/* الكتلة الجاهزة */}
        <div className="rounded-lg border border-teal/40 bg-panel2/40 overflow-hidden">
          <div className="px-3 py-2 border-b border-line/60 flex items-center gap-2 flex-wrap">
            <Icon name="slash" className="w-3.5 h-3.5 text-teal" strokeWidth={2.2} />
            <span className="font-display font-bold text-[12px] text-teal">{t("pasteTitle")}</span>
            <div className="ms-auto flex gap-1.5">
              <CopyBtn text={p.paste} label={t("copyPaste")} labelDone={t("copied")} />
              <DownloadBtn name="visual-prompt-block.txt" content={p.paste} label={t("dlPaste")} labelDone={t("downloaded")} />
            </div>
          </div>
          <button onClick={() => setOpen(!open)} className="w-full text-start">
            <p className={`dir-ltr font-mono text-[11px] leading-relaxed text-teal/90 px-3 py-2.5 transition-all ${open ? "" : "max-h-16 overflow-hidden relative"}`}>
              {p.paste}
              {!open && <span className="absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t from-deep/80 to-transparent" />}
            </p>
          </button>
        </div>

        <div className="flex flex-wrap gap-2 pt-1">
          <CopyBtn text={formatFullSpec(p)} label={t("copyFull")} labelDone={t("copied")} />
          <DownloadBtn name="visual-spec-full.txt" content={formatFullSpec(p)} label={t("dlFull")} labelDone={t("downloaded")} />
          <button onClick={onNew} className="btn-press inline-flex items-center gap-2 rounded-lg border border-teal/40 bg-teal/10 px-3.5 py-2 text-xs font-semibold text-teal hover:bg-teal/20">
            <Icon name="refresh" className="w-4 h-4" /> {t("newReq")}
          </button>
        </div>
        <p className="text-[10px] text-dim leading-relaxed">
          {locale === "ar"
            ? "«نسخ البرومبت كاملًا» ينقل كل التعليمات: النموذج الموصى به، الشخصية، المطلوب، الأوامر، المخرجات، سقف الهلوسة — بالعربية والإنجليزية معًا."
            : "“Copy full prompt” carries every instruction: recommended model, persona, task, commands, outputs, hallucination ceiling — in both Arabic and English."}
        </p>
      </div>
    </div>
  );
}

/* ---------------- بطاقة أمر ---------------- */
function CommandCard({ msg, onUse }: { msg: Msg; onUse: (stack: string) => void }) {
  const { t, locale, L } = useApp();
  const info = msg.cmdInfo!;
  return (
    <div className="glass rounded-xl overflow-hidden">
      <div className="px-4 py-3 border-b border-line glass-top flex items-center gap-2">
        <code className="font-mono font-semibold text-teal dir-ltr text-sm">/{info.cmd.name}</code>
        {info.core && <span className="text-[9.5px] border border-amber/50 text-amber rounded px-1.5 py-0.5 bg-amber/10 font-semibold">Core 64</span>}
        <span className="ms-auto text-[11px] text-dim">{L({ ar: info.cat.title, en: info.cat.en })}</span>
      </div>
      <div className="p-4 space-y-3.5">
        {info.relatedTo && (
          <p className="text-[11.5px] text-mute">
            {t("relatedTo")} <code className="font-mono text-teal dir-ltr">/{info.relatedTo}</code> — {t("relatedNote")}
          </p>
        )}
        <p className="text-[13.5px] leading-relaxed font-medium">
          {L({ ar: info.cmd.fn, en: info.cmd.en })}
          <span className={`ms-2 align-middle text-[9px] rounded px-1.5 py-0.5 border ${info.cat.kind === "task" ? "text-coral border-coral/40 bg-coral/10" : "text-teal border-teal/40 bg-teal/10"}`}>
            {info.cat.kind === "task" ? t("taskBadge") : t("visualBadge")}
          </span>
        </p>
        <div>
          <p className="text-[10.5px] text-dim mb-2 font-semibold">{info.cat.kind === "task" ? t("matrixT") : t("matrix")}</p>
          <div className="grid grid-cols-2 gap-1.5">
            {enginesFor(info.cat.kind).map((m, i) => {
              const rl = ratingLabel(info.cmd.r[i], locale);
              return (
                <div key={m.id} className="flex items-center gap-2 rounded-md border border-line bg-panel2/40 px-2.5 py-1.5">
                  <StatusDot rank={rl.rank} />
                  <span className="text-[11px] font-medium flex-1 truncate">{locale === "ar" ? m.ar : m.name}</span>
                  <span className="text-[9.5px] text-dim">{rl.label}</span>
                </div>
              );
            })}
          </div>
        </div>
        {info.macros.length > 0 && (
          <div>
            <p className="text-[10.5px] text-dim mb-2 font-semibold">{t("macrosT")}</p>
            <div className="flex flex-wrap gap-1.5">
              {info.macros.slice(0, 4).map((m) => (
                <button key={m.combo} onClick={() => onUse(m.combo)} title={L({ ar: m.ar, en: m.en })} className="chip-cmd font-mono text-[10.5px] dir-ltr rounded-md border border-line bg-panel2/40 px-2 py-1 text-teal/90">
                  {m.combo}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ---------------- مؤشر الكتابة ---------------- */
export function TypingRow({ label }: { label: string }) {
  return (
    <Rise className="flex gap-3 items-end">
      <div className="glass rounded-xl rounded-ee-md px-4 py-3 flex items-center gap-3">
        <span className="flex gap-1">
          <span className="tdot w-1.5 h-1.5 rounded-full bg-amber" />
          <span className="tdot w-1.5 h-1.5 rounded-full bg-amber" />
          <span className="tdot w-1.5 h-1.5 rounded-full bg-amber" />
        </span>
        <span className="text-[11.5px] text-mute">{label}</span>
      </div>
    </Rise>
  );
}

/* ---------------- عارض الرسالة ---------------- */
export function MessageView({ msg, onAccept, onDecline, onCmd, onUse, onNew, onChip }: {
  msg: Msg;
  onAccept: () => void;
  onDecline: () => void;
  onCmd: (name: string) => void;
  onUse: (stack: string) => void;
  onNew: () => void;
  onChip: (t: string) => void;
}) {
  if (msg.role === "user") {
    return (
      <Rise>
        <UserHead />
        <div className="glass rounded-xl rounded-ee-md border-amber/25 bg-amber/10 px-4 py-3">
          <p className="text-[13.5px] leading-relaxed whitespace-pre-wrap">{msg.text}</p>
        </div>
      </Rise>
    );
  }
  return (
    <Rise>
      <BotHead />
      {msg.kind === "analysis" && <AnalysisCard msg={msg} onAccept={onAccept} onDecline={onDecline} onCmd={onCmd} />}
      {msg.kind === "prompt" && <PromptCard msg={msg} onNew={onNew} />}
      {msg.kind === "command" && <CommandCard msg={msg} onUse={onUse} />}
      {msg.kind === "text" && (
        <div className="glass rounded-xl rounded-ee-md px-4 py-3">
          <p className="text-[13.5px] leading-relaxed whitespace-pre-wrap">{msg.text}</p>
          {msg.chips && (
            <div className="flex flex-wrap gap-1.5 mt-3">
              {msg.chips.map((ch) => (
                <button key={ch} onClick={() => onChip(ch)} className="chip-cmd text-[11.5px] rounded-md border border-line bg-panel2/50 px-2.5 py-1.5 text-mute hover:text-ink">
                  {ch}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </Rise>
  );
}

export function useAutoScroll(dep: unknown) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: RM ? "auto" : "smooth" });
  }, [dep]);
  return ref;
}
