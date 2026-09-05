export interface CommandDef { name: string; fn: string; en: string; r: string; }
const c = (name: string, fn: string, en: string, r: string): CommandDef => ({ name, fn, en, r });
