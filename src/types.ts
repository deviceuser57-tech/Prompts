import type { Analysis, BuiltPrompt, CommandInfo } from "./lib/engine";

export type FileGroup = "image" | "text" | "pdf" | "audio" | "video" | "archive" | "design" | "other";

export interface AttachedFile {
  id: string;
  name: string;
  size: number;
  mime: string;
  ext: string;
  group: FileGroup;
  thumb?: string;   // معاينة مصغرة dataURL (للصور)
  snippet?: string; // مقتطف نصي (للملفات النصية)
  gone?: boolean;   // حُمّلت البيانات لكن تعذّر حفظها
}

export interface Msg {
  id: string;
  role: "user" | "assistant";
  kind: "text" | "analysis" | "prompt" | "command";
  text?: string;
  analysis?: Analysis;
  prompt?: BuiltPrompt;
  cmdInfo?: CommandInfo;
  ts: number;
  answered?: "yes" | "no";
  chips?: string[];
  files?: AttachedFile[];
}
