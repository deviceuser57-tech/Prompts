import { useEffect, useRef, useState } from "react";
import type { Msg } from "../types";
import type { Analysis } from "../lib/engine";
import { MODELS, ratingLabel } from "../data/commands";
import { Icon, StatusDot } from "./Icons";

/* ---------------- نسخ ---------------- */
export function useCopy(timeout = 1600) {
  const [copied, setCopied] = useState(false);
  const t = useRef<number | null>(null);
  const copy = (text: string) => {
    navigator.clipboard?.writeText(text).catch(() => {});
    setCopied(true);
    if (t.current) window.clearTimeout(t.current);
    t.current = window.setTimeout(() => setCopied(false), timeout);
  };
  return { copied, copy };
}

function CopyBtn({ text, label = "نسخ" }: { text: string; label?: string }) {
  const { copied, copy } = useCopy();
  return (
    <button
      onClick={() => copy(text)}
      className="btn-press inline-flex items-center gap-1.5 rounded-md border border-line bg-panel px-2.5 py-1.5 text-xs font-medium text-mute hover:text-ink hover:border-teal/50"
    >
      <Icon name={copied ? "check" : "copy"} className="w-3.5 h-3.5" strokeWidth={2.2} />
      <span className={copied ? "text-good" : ""}>{copied ? "نُسخ" : label}</span>
    </button>
  );
}

function DownloadBtn({ name, content, label, compact = false }: { name: string; content: string; label: string; compact?: boolean }) {
  const [done, setDone] = useState(false);
  const t = useRef<number | null>(null);
  const go = () => {
    download(name, content);
    setDone(true);
    if (t.current) window.clearTimeout(t.current);
    t.current = window.setTimeout(() => setDone(false), 1800);
  };
  return (
    <button
      onClick={go}
      className={`btn-press inline-flex items-center gap-1.5 font-medium ${
        compact
          ? "rounded-md border border-line bg-panel px-2.5 py-1.5 text-xs text-mute hover:text-ink hover:border-teal/50"
          : "rounded-lg border border-line bg-panel px-3.5 py-2 text-xs text-mute hover:text-ink"
      }`}
    >
      <Icon name={done ? "check" : "download"} className="w-3.5 h-3.5" strokeWidth={2.2} />
      <span className={done ? "text-good" : ""}>{done ? "نُزّل" : label}</span>
    </button>
  );
}

function download(name: string, content: string) {
  try {
    const blob = new Blob(["\uFEFF" + content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    a.rel = "noopener";
    document.body.appendChild(a); // إرفاق بالـ DOM يضمن عمل النقرة في كل المتصفحات
    a.click();
    document.body.removeChild(a);
    // نؤجل الإلغاء حتى يبدأ التنزيل فعلًا
    window.setTimeout(() => URL.revokeObjectURL(url), 1500);
  } catch (err) {
    console.error("فشل التنزيل:", err);
    window.alert("تعذّر التنزيل — جرّب زر النسخ بدلًا منه.");
  }
}

/* ---------------- رؤوس الرسائل ---------------- */
function BotHead() {
  return (
    <div className="flex items-center gap-2.5 mb-2">
      <div className="relative grid place-items-center w-8 h-8 rounded-lg bg-gradient-to-br from-panel2 to-panel border border-line text-amber">
        <Icon name="aperture" className="w-5 h-5" strokeWidth={1.6} />
        <span className="absolute -bottom-0.5 -left-0.5 w-2.5 h-2.5 rounded-full bg-teal border-2 border-deep pulse-ring" />
      </div>
      <div className="leading-none">
        <p className="font-display font-bold text-sm">مُحرّك البصر</p>
        <p className="text-[10px] text-dim mt-1">يحلّل · يقارن · يركّب البرومبت</p>
      </div>
    </div>
  );
}
function UserHead() {
  return (
    <div className="flex items-center justify-end gap-2.5 mb-2">
      <div className="leading-none text-left">
        <p className="font-display font-bold text-sm">أنت</p>
        <p className="text-[10px] text-dim mt-1">طلب مُرسَل للمراجعة</p>
      </div>
      <div className="grid place-items-center w-8 h-8 rounded-lg bg-amber/15 border border-amber/40 text-amberhi">
        <Icon name="user" className="w-4.5 h-4.5" />
      </div>
    </div>
  );
}

/* ---------------- بطاقة التحليل ---------------- */
function ModelBars({ a }: { a: Analysis }) {
  return (
    <div className="space-y-2.5">
      {a.models.map((m, i) => (
        <div key={m.modelId} className="group">
          <div className="flex items-center justify-between gap-2 mb-1">
            <div className="flex items-center gap-2">
              <span
                className={`font-display text-sm font-bold ${i === 0 ? "text-amberhi" : "text-ink"}`}
                style={i === 0 ? { textShadow: "0 0 18px rgba(242,163,60,0.45)" } : undefined}
              >
                {i === 0 && <span className="ml-1 text-[10px] align-middle border border-amber/50 text-amber rounded px-1.5 py-0.5 bg-amber/10">الأنسب</span>}
                {m.ar}
              </span>
            </div>
            <span className="font-mono text-xs text-mute dir-ltr">{m.pct}%</span>
          </div>
          <div className="h-1.5 rounded-full bg-panel2 overflow-hidden">
            <div className="bar-fill h-full rounded-full" style={{ width: `${m.pct}%`, background: `linear-gradient(90deg, ${m.hue}55, ${m.hue})`, animationDelay: `${i * 0.12}s` }} />
          </div>
          <p className="text-[11px] text-mute mt-1 leading-relaxed">
            {m.reasons.length ? m.reasons.join(" · ") : m.strengths}
          </p>
        </div>
      ))}
    </div>
  );
}

function AnalysisCard({ msg, onAccept, onDecline, onCmd }: {
  msg: Msg; onAccept: () => void; onDecline: () => void; onCmd: (name: string) => void;
}) {
  const a = msg.analysis!;
  const top = a.models[0];
  const done = !!msg.answered;
  return (
    <div className="rounded-xl border border-line bg-panel/80 backdrop-blur-sm overflow-hidden">
      <div className="px-4 py-3 border-b border-line bg-gradient-to-l from-panel2/60 to-transparent flex items-center gap-2">
        <Icon name="bolt" className="w-4 h-4 text-amber" strokeWidth={2} />
        <h3 className="font-display font-bold text-sm">مراجعة سريعة لطلبك</h3>
        <span className="mr-auto font-mono text-[10px] text-dim dir-ltr">{a.stackLine || "—"}</span>
      </div>

      <div className="p-4 space-y-5">
        <p className="text-[13px] leading-relaxed text-ink/90">{a.summary}</p>

        {/* 1) النموذج الأنسب */}
        <section>
          <SectionTitle n="1" title="أنسب نموذج لتنفيذ المطلوب" />

          {/* بانر التوصية الأولى */}
          <div className="mb-3 rounded-lg border border-amber/50 bg-gradient-to-l from-amber/15 via-amber/5 to-transparent px-3.5 py-3 flex items-center gap-3 shadow-[0_0_30px_rgba(242,163,60,0.08)]">
            <div className="grid place-items-center w-9 h-9 shrink-0 rounded-lg bg-amber text-deep shadow-[0_4px_16px_rgba(242,163,60,0.4)]">
              <Icon name="crown" className="w-5 h-5" strokeWidth={2} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] text-amber font-semibold mb-0.5">التوصية الأولى للتنفيذ</p>
              <p className="font-display font-extrabold text-base text-amberhi leading-tight" style={{ textShadow: "0 0 20px rgba(242,163,60,0.4)" }}>
                {top.ar} <span className="font-mono text-[11px] font-normal text-mute">({top.name})</span>
              </p>
              <p className="text-[11px] text-mute mt-1 leading-relaxed">
                {top.reasons.length ? top.reasons.join(" · ") : top.strengths}
              </p>
            </div>
            <span className="shrink-0 font-mono text-sm font-bold text-amberhi dir-ltr">{top.pct}%</span>
          </div>

          <ModelBars a={a} />
        </section>

        {/* 2) الأوامر */}
        <section>
          <SectionTitle n="2" title="الأوامر والنتيجة المتوقعة" />
          <div className="space-y-2">
            {a.commands.map((p) => {
              const ri = MODELS.findIndex((m) => m.id === top.modelId);
              const rl = ratingLabel(p.cmd.r[ri]);
              return (
                <button
                  key={p.cmd.name}
                  onClick={() => onCmd(p.cmd.name)}
                  className="chip-cmd w-full text-right rounded-lg border border-line bg-deep/50 px-3 py-2.5 flex items-start gap-3 group"
                >
                  <code className="shrink-0 font-mono text-[12px] font-semibold text-teal bg-teal/8 border border-teal/25 rounded px-2 py-0.5 dir-ltr mt-0.5">/{p.cmd.name}</code>
                  <span className="flex-1 min-w-0">
                    <span className="block text-[12.5px] text-ink leading-snug">{p.cmd.fn}</span>
                    <span className="block text-[10.5px] text-dim mt-0.5">النتيجة المتوقعة على {top.name}: {rl.label} · {p.catTitle}</span>
                  </span>
                  <StatusDot rank={rl.rank} />
                </button>
              );
            })}
          </div>
          <p className="text-[10.5px] text-dim mt-2 flex items-center gap-1.5">
            <Icon name="info" className="w-3.5 h-3.5" />
            اضغط أي أمر لفتح بطاقته من القاموس مع مصفوفة التوافق الكاملة.
          </p>
        </section>

        {/* 3) العرض */}
        <section>
          <SectionTitle n="3" title="البرومبت النهائي" />
          <div className={`rounded-lg border border-dashed p-3.5 transition-colors ${done ? "border-line bg-deep/30" : "border-amber/50 bg-amber/5"}`}>
            <p className="text-[13px] leading-relaxed">
              {done
                ? msg.answered === "yes"
                  ? "تم — جهّزت لك البرومبت الاحترافي في الأسفل."
                  : "تمام، خذ وقتك. اكتب تعديلك وسأعيد المراجعة فورًا."
                : "هل أحوّل كل ما سبق إلى برومبت احترافي شامل؟ (الشخصية + المطلوب + تركيبة الأوامر + المخرجات النهائية + سقف الهلوسة + عدد الصور)"}
            </p>
            {!done && (
              <div className="flex flex-wrap gap-2 mt-3">
                <button onClick={onAccept} className="btn-press pop-in inline-flex items-center gap-2 rounded-lg bg-amber text-deep font-display font-bold text-sm px-4 py-2 hover:bg-amberhi shadow-[0_4px_20px_rgba(242,163,60,0.35)]">
                  <Icon name="spark" className="w-4 h-4" strokeWidth={2} />
                  نعم، اكتب البرومبت النهائي
                </button>
                <button onClick={onDecline} className="btn-press inline-flex items-center gap-2 rounded-lg border border-line bg-panel px-4 py-2 text-sm text-mute hover:text-ink hover:border-coral/50">
                  <Icon name="refresh" className="w-4 h-4" />
                  لا، أريد التعديل أولًا
                </button>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

function SectionTitle({ n, title }: { n: string; title: string }) {
  return (
    <h4 className="flex items-center gap-2 mb-2.5">
      <span className="grid place-items-center w-5.5 h-5.5 min-w-5 rounded-md bg-amber/15 border border-amber/40 text-amber font-display font-bold text-[11px]">{n}</span>
      <span className="font-display font-bold text-[13.5px]">{title}</span>
      <span className="flex-1 h-px bg-line" />
    </h4>
  );
}

/* ---------------- بطاقة البرومبت النهائي ---------------- */
function PromptCard({ msg, onNew }: { msg: Msg; onNew: () => void }) {
  const p = msg.prompt!;
  const [open, setOpen] = useState(true);
  return (
    <div className="rounded-xl border border-amber/40 bg-panel/90 overflow-hidden shadow-[0_0_40px_rgba(242,163,60,0.08)]">
      <div className="px-4 py-3 border-b border-line bg-gradient-to-l from-amber/15 to-transparent flex items-center gap-2">
        <Icon name="spark" className="w-4.5 h-4.5 text-amber" strokeWidth={2} />
        <h3 className="font-display font-bold text-sm">{p.title}</h3>
        <span className="mr-auto inline-flex items-center gap-1 text-[10px] font-mono text-good border border-good/40 bg-good/10 rounded px-2 py-0.5">
          <span className="w-1.5 h-1.5 rounded-full bg-good blink" />
          جاهز للتنفيذ
        </span>
      </div>

      {/* الميتا */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-px bg-line">
        {[
          { k: "النموذج", v: p.meta.model },
          { k: "عدد الصور", v: String(p.meta.count) },
          { k: "الأبعاد", v: p.meta.ratio },
          { k: "سقف الهلوسة", v: p.meta.halluc },
          { k: "الأوامر", v: `${p.meta.stack.split("+").length} عمليات` },
        ].map((m, idx) => (
          <div key={m.k} className={`px-3 py-2.5 ${idx === 0 ? "bg-amber/15" : "bg-panel"}`}>
            <p className={`text-[9.5px] mb-1 ${idx === 0 ? "text-amber" : "text-dim"}`}>{m.k}</p>
            <p className={`text-[11.5px] font-semibold leading-tight ${idx === 0 ? "text-amberhi" : "text-ink"}`}>{m.v}</p>
          </div>
        ))}
      </div>

      <div className="p-4 space-y-3">
        {p.sections.map((s, i) => {
          const isModel = s.h.includes("النموذج الموصى به");
          return (
            <div
              key={i}
              className={`reveal on rounded-lg border ${
                isModel
                  ? "border-amber/55 bg-gradient-to-l from-amber/15 via-amber/5 to-transparent shadow-[0_0_30px_rgba(242,163,60,0.1)]"
                  : "border-line bg-deep/50"
              }`}
            >
              <div className={`px-3 py-2 flex items-center gap-2 border-b ${isModel ? "border-amber/30" : "border-line/60"}`}>
                {isModel && <Icon name="crown" className="w-4 h-4 text-amber" strokeWidth={2} />}
                <span className={`font-display font-bold text-[12px] ${isModel ? "text-amberhi" : "text-amberhi"}`}>{i + 1}. {s.h}</span>
                {isModel && (
                  <span className="mr-auto text-[9.5px] font-semibold text-amber border border-amber/50 bg-amber/10 rounded px-1.5 py-0.5">
                    ابدأ من هنا
                  </span>
                )}
              </div>
              <p className={`px-3 py-2.5 text-[12px] leading-relaxed whitespace-pre-wrap ${isModel ? "text-ink" : "text-ink/85"}`}>{s.body}</p>
            </div>
          );
        })}

        {/* الكتلة الجاهزة */}
        <div className="rounded-lg border border-teal/35 bg-deep/70 overflow-hidden">
          <div className="px-3 py-2 border-b border-line/60 flex items-center gap-2">
            <Icon name="slash" className="w-3.5 h-3.5 text-teal" strokeWidth={2.2} />
            <span className="font-display font-bold text-[12px] text-teal">الكتلة الجاهزة للصق (English)</span>
            <div className="mr-auto flex gap-1.5">
              <CopyBtn text={p.paste} label="نسخ البرومبت" />
              <DownloadBtn name="visual-prompt.txt" content={p.paste} label="تنزيل" compact />
            </div>
          </div>
          <button onClick={() => setOpen(!open)} className="w-full text-right">
            <p className={`dir-ltr font-mono text-[11px] leading-relaxed text-teal/90 px-3 py-2.5 transition-all ${open ? "" : "max-h-16 overflow-hidden relative"}`}>
              {p.paste}
              {!open && <span className="absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t from-deep to-transparent" />}
            </p>
          </button>
        </div>

        <div className="flex flex-wrap gap-2 pt-1">
          <DownloadBtn
            name="visual-spec-full.txt"
            content={formatFull(p)}
            label="تنزيل المواصفة الكاملة (.txt)"
          />
          <button onClick={onNew} className="btn-press inline-flex items-center gap-2 rounded-lg border border-teal/40 bg-teal/10 px-3.5 py-2 text-xs font-semibold text-teal hover:bg-teal/20">
            <Icon name="refresh" className="w-4 h-4" /> طلب جديد
          </button>
        </div>
      </div>
    </div>
  );
}

function formatFull(pp: NonNullable<Msg["prompt"]>): string {
  return [
    `${pp.title}`,
    `النموذج: ${pp.meta.model} | العدد: ${pp.meta.count} | الأبعاد: ${pp.meta.ratio} | الهلوسة: ${pp.meta.halluc}`,
    `تركيبة الأوامر: ${pp.meta.stack}`,
    "",
    ...pp.sections.map((s, i) => `${i + 1}) ${s.h}\n${s.body}`),
    "",
    "PASTE BLOCK:",
    pp.paste,
  ].join("\n\n");
}

/* ---------------- بطاقة أمر من القاموس ---------------- */
function CommandCard({ msg, onUse }: { msg: Msg; onUse: (stack: string) => void }) {
  const info = msg.cmdInfo!;
  return (
    <div className="rounded-xl border border-line bg-panel/85 overflow-hidden">
      <div className="px-4 py-3 border-b border-line flex items-center gap-2 bg-gradient-to-l from-teal/10 to-transparent">
        <code className="font-mono font-semibold text-teal dir-ltr text-sm">/{info.cmd.name}</code>
        {info.core && <span className="text-[9.5px] border border-amber/50 text-amber rounded px-1.5 py-0.5 bg-amber/10 font-semibold">Core 64</span>}
        <span className="mr-auto text-[11px] text-dim">{info.cat.title} · {info.cat.en}</span>
      </div>
      <div className="p-4 space-y-3.5">
        {info.relatedTo && (
          <p className="text-[11.5px] text-mute">
            اسم مرتبط بـ <code className="font-mono text-teal dir-ltr">/{info.relatedTo}</code> — أعرض لك الأمر الأساسي.
          </p>
        )}
        <p className="text-[13.5px] leading-relaxed">{info.cmd.fn}</p>

        <div>
          <p className="text-[10.5px] text-dim mb-2 font-semibold">مصفوفة التوافق عبر النماذج:</p>
          <div className="grid grid-cols-2 gap-1.5">
            {MODELS.map((m, i) => {
              const rl = ratingLabel(info.cmd.r[i]);
              return (
                <div key={m.id} className="flex items-center gap-2 rounded-md border border-line bg-deep/50 px-2.5 py-1.5">
                  <StatusDot rank={rl.rank} />
                  <span className="text-[11px] font-medium flex-1 truncate">{m.name}</span>
                  <span className="text-[9.5px] text-dim">{rl.label}</span>
                </div>
              );
            })}
          </div>
        </div>

        {info.macros.length > 0 && (
          <div>
            <p className="text-[10.5px] text-dim mb-2 font-semibold">ماكروهات جاهزة للدمج:</p>
            <div className="flex flex-wrap gap-1.5">
              {info.macros.slice(0, 4).map((m) => (
                <button key={m.combo} onClick={() => onUse(m.combo)} title={m.result} className="chip-cmd font-mono text-[10.5px] dir-ltr rounded-md border border-line bg-deep/50 px-2 py-1 text-teal/90">
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
    <div className="msg-in flex gap-3 items-end">
      <div className="rounded-xl rounded-br-md border border-line bg-panel/80 px-4 py-3 flex items-center gap-3">
        <span className="flex gap-1">
          <span className="tdot w-1.5 h-1.5 rounded-full bg-amber" />
          <span className="tdot w-1.5 h-1.5 rounded-full bg-amber" />
          <span className="tdot w-1.5 h-1.5 rounded-full bg-amber" />
        </span>
        <span className="text-[11.5px] text-mute">{label}</span>
      </div>
    </div>
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
      <div className="msg-in">
        <UserHead />
        <div className="rounded-xl rounded-tl-md border border-amber/25 bg-amber/10 px-4 py-3">
          <p className="text-[13.5px] leading-relaxed whitespace-pre-wrap">{msg.text}</p>
        </div>
      </div>
    );
  }
  return (
    <div className="msg-in">
      <BotHead />
      {msg.kind === "analysis" && <AnalysisCard msg={msg} onAccept={onAccept} onDecline={onDecline} onCmd={onCmd} />}
      {msg.kind === "prompt" && <PromptCard msg={msg} onNew={onNew} />}
      {msg.kind === "command" && <CommandCard msg={msg} onUse={onUse} />}
      {(msg.kind === "text") && (
        <div className="rounded-xl rounded-br-md border border-line bg-panel/80 px-4 py-3">
          <p className="text-[13.5px] leading-relaxed whitespace-pre-wrap">{msg.text}</p>
          {msg.chips && (
            <div className="flex flex-wrap gap-1.5 mt-3">
              {msg.chips.map((c) => (
                <button key={c} onClick={() => onChip(c)} className="chip-cmd text-[11.5px] rounded-md border border-line bg-deep/50 px-2.5 py-1.5 text-mute hover:text-ink">
                  {c}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function useAutoScroll(dep: unknown) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [dep]);
  return ref;
}
