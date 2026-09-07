import { useRef, useState } from "react";
import type { ChatSession } from "../lib/storage";
import { deleteSession, exportMessagesJSON, importMessagesJSON, shareJSON } from "../lib/storage";
import { useApp } from "../lib/i18n";
import type { Msg } from "../types";
import { Icon } from "./Icons";

export function SessionTray({ sessions, currentId, onOpen, onNew, msgs }: {
  sessions: ChatSession[];
  currentId: string | null;
  onOpen: (id: string) => void;
  onNew: () => void;
  msgs: Msg[];
}) {
  const { t, L } = useApp();
  const [open, setOpen] = useState(false);
  const [flash, setFlash] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const fire = (k: string) => { setFlash(k); window.setTimeout(() => setFlash(null), 1800); };

  const fmt = (ts: number) => new Date(ts).toLocaleString(L({ ar: "ar-EG", en: "en-US" }), { dateStyle: "short", timeStyle: "short" });

  const onImport = (f: File) => {
    importMessagesJSON(f).then((arr) => {
      // إنشاء جلسة مستوردة من الرسائل المُحمَّلة
      (window as any).__basarImport?.(arr);
      fire("ok");
    }).catch(() => fire("err"));
  };

  return (
    <>
      <button
        onClick={() => setOpen(!open)}
        className="btn-press inline-flex items-center gap-1.5 glass rounded-lg px-3 py-2 text-[11.5px] font-semibold text-mute hover:text-amber hover:border-amber/50"
        title={t("sessions")}
        aria-label={t("sessions")}
      >
        <Icon name="chat" className="w-4 h-4" />
        <span className="hidden sm:inline">{t("sessions")}</span>
        {sessions.length > 0 && <span className="text-[9px] font-mono text-teal">{sessions.length}</span>}
      </button>

      {open && (
        <div className="absolute top-full end-0 mt-2 z-40 w-80 max-h-[70vh] overflow-hidden glass glass-strong rounded-xl shadow-[0_24px_80px_rgba(0,0,0,0.45)] flex flex-col">
          <div className="px-3 pt-3 pb-2 border-b border-line flex items-center gap-2">
            <h3 className="font-display font-bold text-sm flex-1">{t("sessions")}</h3>
            <button onClick={() => { setOpen(false); onNew(); }} className="btn-press inline-flex items-center gap-1 rounded-md border border-amber/50 bg-amber/10 px-2 py-1 text-[11px] font-semibold text-amber hover:bg-amber/20">
              <Icon name="plus" className="w-3.5 h-3.5" /> {t("newSession")}
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
            {sessions.length === 0 && (
              <p className="text-[11px] text-dim text-center py-6">{t("noSessions")}</p>
            )}
            {sessions.map((s) => (
              <div key={s.id} className={`flex items-center gap-2 rounded-lg border px-2.5 py-2 text-start transition-colors ${s.id === currentId ? "border-amber/60 bg-amber/10" : "border-line bg-panel2/30 hover:border-teal/40"}`}>
                <button onClick={() => { setOpen(false); onOpen(s.id); }} className="flex-1 min-w-0 text-start">
                  <p className="text-[12px] font-semibold truncate">{s.title || t("newSession")}</p>
                  <p className="text-[9.5px] text-dim mt-0.5 font-mono dir-ltr">{fmt(s.updatedAt)} · {s.msgs.length} msg</p>
                </button>
                <button
                  onClick={() => { deleteSession(s.id); if (s.id === currentId) onOpen("__none__"); }}
                  className="text-dim hover:text-coral p-1"
                  title={t("deleteSession")}
                  aria-label={t("deleteSession")}
                >
                  <Icon name="trash" className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
          <div className="p-2 border-t border-line flex items-center gap-1.5">
            <button
              onClick={() => { exportMessagesJSON(msgs); fire("ok"); }}
              className="btn-press flex-1 inline-flex items-center justify-center gap-1 rounded-md border border-line bg-panel2/50 px-2 py-1.5 text-[11px] text-mute hover:text-teal"
            >
              <Icon name="download" className="w-3.5 h-3.5" /> {t("exportJson")}
            </button>
            <button
              onClick={() => fileRef.current?.click()}
              className="btn-press flex-1 inline-flex items-center justify-center gap-1 rounded-md border border-line bg-panel2/50 px-2 py-1.5 text-[11px] text-mute hover:text-teal"
            >
              <Icon name="upload" className="w-3.5 h-3.5" /> {t("importJson")}
            </button>
            <button
              onClick={() => { const u = shareJSON(msgs); if (u) fire("ok"); }}
              className="btn-press flex-1 inline-flex items-center justify-center gap-1 rounded-md border border-line bg-panel2/50 px-2 py-1.5 text-[11px] text-mute hover:text-amber"
            >
              <Icon name="share" className="w-3.5 h-3.5" /> {t("shareChat")}
            </button>
            <input
              ref={fileRef} type="file" accept="application/json,.json" className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) onImport(f); e.target.value = ""; }}
            />
          </div>
          {flash && <p className="px-3 pb-2 text-[10.5px] text-good">{flash === "ok" ? t("done") : t("errImport")}</p>}
        </div>
      )}
    </>
  );
}
