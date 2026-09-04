import { useEffect, useMemo, useRef, useState } from "react";
import { CATEGORIES, CORE64, MODELS, RELATED, ALL_COMMANDS, type CommandDef, type Category, ratingLabel } from "../data/commands";
import { Icon, StatusDot } from "./Icons";

function useReveal() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => e.isIntersecting && e.target.classList.add("on")),
      { root: el, rootMargin: "0px 0px -10% 0px" }
    );
    el.querySelectorAll(".reveal").forEach((n) => io.observe(n));
    return () => io.disconnect();
  });
  return ref;
}

interface LibraryProps {
  onAsk: (text: string) => void;
  onRequestCommand: (name: string) => void;
}

export function Library({ onAsk, onRequestCommand }: LibraryProps) {
  const [q, setQ] = useState("");
  const [catId, setCatId] = useState<string>("all");
  const [sel, setSel] = useState<{ cmd: CommandDef; cat: Category } | null>(null);
  const listRef = useReveal();

  const normQ = q.trim().toLowerCase();
  const results = useMemo(() => {
    let rows: { cmd: CommandDef; cat: Category }[] = ALL_COMMANDS.map((cmd) => ({
      cmd,
      cat: CATEGORIES.find((c) => c.commands.includes(cmd))!,
    }));
    if (catId !== "all") rows = rows.filter((r) => r.cat.id === catId);
    if (normQ) {
      rows = rows.filter(
        (r) => r.cmd.name.includes(normQ) || r.cmd.fn.includes(q.trim()) || r.cat.title.includes(q.trim())
      );
    }
    return rows;
  }, [catId, normQ, q]);

  return (
    <div className="relative h-full flex flex-col bg-panel/60 border border-line rounded-xl overflow-hidden">
      {/* رأس اللوحة */}
      <div className="p-3.5 border-b border-line bg-gradient-to-l from-panel2/70 to-transparent">
        <div className="flex items-center gap-2 mb-3">
          <Icon name="book" className="w-4.5 h-4.5 text-teal" />
          <h2 className="font-display font-bold text-sm">القاموس البصري</h2>
          <span className="mr-auto font-mono text-[10px] text-dim dir-ltr">{results.length} / {ALL_COMMANDS.length}</span>
        </div>
        <label className="flex items-center gap-2 rounded-lg border border-line bg-deep/60 px-3 py-2 focus-within:border-teal/60 transition-colors">
          <Icon name="search" className="w-4 h-4 text-dim" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="ابحث: logo، مقطع، انفوجرافيك…"
            className="flex-1 bg-transparent text-[12.5px] placeholder:text-dim text-ink"
          />
          {q && (
            <button onClick={() => setQ("")} className="text-dim hover:text-ink btn-press"><Icon name="close" className="w-3.5 h-3.5" /></button>
          )}
        </label>
      </div>

      {/* تبويبات الفئات */}
      <div className="flex gap-1.5 px-3.5 py-2.5 overflow-x-auto border-b border-line [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <CatChip active={catId === "all"} onClick={() => setCatId("all")} label="الكل" />
        {CATEGORIES.map((c) => (
          <CatChip key={c.id} active={catId === c.id} onClick={() => setCatId(c.id)} label={c.title} />
        ))}
      </div>

      {/* القائمة */}
      <div ref={listRef} className="flex-1 overflow-y-auto p-2.5 space-y-1.5">
        {results.length === 0 && (
          <div className="text-center py-14 text-dim">
            <Icon name="search" className="w-8 h-8 mx-auto mb-3 opacity-40" />
            <p className="text-[12.5px]">لا نتائج مطابقة — جرّب كلمة أخرى</p>
          </div>
        )}
        {results.map(({ cmd, cat }, i) => {
          const core = CORE64.has(cmd.name);
          const alias = Object.entries(RELATED).find(([a, p]) => p === cmd.name)?.[0];
          return (
            <button
              key={cmd.name}
              onClick={() => setSel({ cmd, cat })}
              className="reveal chip-cmd w-full text-right rounded-lg border border-line/70 bg-deep/40 px-3 py-2.5 flex items-center gap-2.5"
              style={{ transitionDelay: `${Math.min(i % 12, 8) * 30}ms` }}
            >
              <code className="shrink-0 font-mono text-[11.5px] font-semibold text-teal dir-ltr">/{cmd.name}</code>
              <span className="flex-1 min-w-0">
                <span className="block text-[11.5px] text-ink/90 truncate">{cmd.fn}</span>
                <span className="block text-[9.5px] text-dim mt-0.5">
                  {cat.title}{alias ? ` · يرتبط بـ /${alias}` : ""}
                </span>
              </span>
              {core && <span className="shrink-0 text-[8.5px] font-bold border border-amber/45 text-amber rounded px-1 py-0.5 bg-amber/10">64</span>}
            </button>
          );
        })}
        <p className="text-center text-[10px] text-dim pt-3 pb-1">الحد الأدنى الموثق: 64 codeword · والقائمة قابلة للتركيب ∞</p>
      </div>

      {/* نافذة التفاصيل */}
      {sel && (
        <div className="absolute inset-0 z-10 flex flex-col bg-deep/60 backdrop-blur-[2px]" onClick={() => setSel(null)}>
          <div className="mt-auto pop-in rounded-t-2xl border-t border-line bg-panel max-h-[82%] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="sticky top-0 bg-panel border-b border-line px-4 py-3 flex items-center gap-2">
              <code className="font-mono font-bold text-teal dir-ltr text-base">/{sel.cmd.name}</code>
              {CORE64.has(sel.cmd.name) && <span className="text-[9.5px] border border-amber/50 text-amber rounded px-1.5 py-0.5 bg-amber/10 font-bold">Core 64</span>}
              <button onClick={() => setSel(null)} className="mr-auto btn-press text-dim hover:text-ink"><Icon name="close" className="w-4.5 h-4.5" /></button>
            </div>
            <div className="p-4 space-y-4">
              <p className="text-[13.5px] leading-relaxed">{sel.cmd.fn}</p>
              <p className="text-[11px] text-dim -mt-2">{sel.cat.title} · {sel.cat.en}</p>

              <div>
                <p className="text-[10.5px] font-semibold text-dim mb-2">التوافق عبر 8 نماذج:</p>
                <div className="space-y-1.5">
                  {MODELS.map((m, i) => {
                    const rl = ratingLabel(sel.cmd.r[i]);
                    return (
                      <div key={m.id} className="flex items-center gap-2.5 rounded-md border border-line bg-deep/50 px-3 py-2">
                        <StatusDot rank={rl.rank} />
                        <span className="text-[12px] font-medium flex-1">{m.name}</span>
                        <span className="text-[10px] text-dim">{rl.label}</span>
                        <span className="font-mono text-[9px] text-dim dir-ltr w-6 text-left">{rl.rank}/3</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => { onRequestCommand(sel.cmd.name); setSel(null); }}
                  className="btn-press inline-flex items-center gap-2 rounded-lg bg-teal text-deep font-display font-bold text-[12.5px] px-4 py-2 hover:brightness-110"
                >
                  <Icon name="chat" className="w-4 h-4" /> اسأل المساعد عنه
                </button>
                <button
                  onClick={() => { onAsk(`كيف أستخدم /${sel.cmd.name} مع أمر آخر؟ اقترح ماكرو`); setSel(null); }}
                  className="btn-press inline-flex items-center gap-2 rounded-lg border border-line bg-panel2 px-4 py-2 text-[12.5px] text-mute hover:text-ink"
                >
                  <Icon name="layers" className="w-4 h-4" /> اقترح تركيبة
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function CatChip({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button
      onClick={onClick}
      className={`btn-press shrink-0 rounded-md px-2.5 py-1.5 text-[11px] font-medium border transition-colors ${
        active ? "bg-teal/15 border-teal/50 text-teal" : "border-line bg-deep/40 text-mute hover:text-ink"
      }`}
    >
      {label}
    </button>
  );
}
