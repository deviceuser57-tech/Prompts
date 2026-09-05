import type { Msg } from "../types";

/* ============================================================
 * إدارة الجلسات والمحادثات المتعددة + حفظ/مشاركة/تصدير
 * ============================================================ */

export interface ChatSession {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  msgs: Msg[];
}

const LS_PREFIX = "basar.chat.v3";
const LS_SESSIONS = "basar.sessions.v1";

function safeGet(key: string): string | null {
  try { return localStorage.getItem(key); } catch { return null; }
}
function safeSet(key: string, value: string) {
  try { localStorage.setItem(key, value); } catch { /* ignore */ }
}
let counter = Date.now();
export function uid(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  counter += 1;
  return `${Date.now().toString(36)}-${counter.toString(36)}`;
}

/* ---------- الجلسات المتعددة ---------- */
export function loadSessions(): ChatSession[] {
  try {
    const raw = safeGet(LS_SESSIONS);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as ChatSession[];
    return Array.isArray(parsed) ? parsed : [];
  } catch { return []; }
}
export function saveSessions(sessions: ChatSession[]) {
  safeSet(LS_SESSIONS, JSON.stringify(sessions.slice(0, 300)));
}
export function createSession(title = "محادثة جديدة"): ChatSession {
  const s: ChatSession = { id: uid(), title, createdAt: Date.now(), updatedAt: Date.now(), msgs: [] };
  const all = loadSessions();
  all.unshift(s);
  saveSessions(all);
  return s;
}
export function updateSession(session: ChatSession | null, msgs: Msg[]) {
  if (!session) {
    /* وضع بدون جلسات: نخزن آخر رسائل تحت المفتاح الأساسي (توافق) */
    safeSet(LS_PREFIX, JSON.stringify(msgs.slice(-40)));
    return;
  }
  const all = loadSessions();
  const idx = all.findIndex((s) => s.id === session.id);
  const upd: ChatSession = { ...session, updatedAt: Date.now(), msgs: msgs.slice(-80) };
  if (idx >= 0) all[idx] = upd; else all.unshift(upd);
  saveSessions(all);
}
export function getSession(id: string): ChatSession | null {
  return loadSessions().find((s) => s.id === id) ?? null;
}
export function deleteSession(id: string) {
  const all = loadSessions().filter((s) => s.id !== id);
  saveSessions(all);
  if (id === "__legacy__") safeSet(LS_PREFIX, "");
}

/* ---------- التصدير / المشاركة ---------- */
export function exportMessagesJSON(msgs: Msg[]): void {
  const data = { exportedAt: new Date().toISOString(), app: "basar-codewords", msgs };
  download("basar-chat-export.json", JSON.stringify(data, null, 2));
}
export function importMessagesJSON(file: File): Promise<Msg[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result));
        if (Array.isArray(parsed)) return resolve(parsed as Msg[]);
        if (parsed && Array.isArray(parsed.msgs)) return resolve(parsed.msgs as Msg[]);
        return reject(new Error("invalid-format"));
      } catch (e) { reject(e); }
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsText(file);
  });
}

export function download(name: string, content: string) {
  try {
    const blob = new Blob(["\uFEFF" + content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = name; a.rel = "noopener";
    document.body.appendChild(a); a.click(); a.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1500);
  } catch { /* ignore */ }
}

export function shareJSON(msgs: Msg[]): string {
  try {
    const url = new URL(window.location.href);
    url.searchParams.set("chat", encodeURIComponent(JSON.stringify(msgs)));
    if (navigator.clipboard) navigator.clipboard.writeText(url.href);
    return url.href;
  } catch { return ""; }
}
