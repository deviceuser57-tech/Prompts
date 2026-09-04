import type { Analysis, BuiltPrompt, CommandInfo } from "./lib/engine";

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
}
