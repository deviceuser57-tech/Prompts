/* ============================================================================
 * INTENT ANALYZER
 * ============================================================================
 * Analyzes user intent and determines which prompt components are
 * required, recommended, optional, or not applicable.
 * 
 * This is the "intelligence" layer that prevents over-engineering simple
 * prompts while ensuring complex tasks get proper structure.
 * ============================================================================ */

import type {
  TaskType,
  RiskLevel,
  ComponentStatus,
  PersonaSpec,
  ContextSource,
  Bi,
} from "./specification";
import { normalize } from "../engine";

/* ============================================================================
 * TYPES
 * ============================================================================ */

export interface IntentAnalyzerInput {
  userText: string;
  language: "ar" | "en" | "mixed";
  contextSources: ContextSource[];
  attachedFiles: Array<{ name: string; type: string }>;
  userPreferences?: {
    defaultMode?: "quick" | "expert" | "enterprise";
  };
  selectedCategory?: string;
  selectedStyle?: string;
  selectedTarget?: string;
}

export interface PromptComponentDecision {
  component: string;
  status: ComponentStatus;
  reason: string;
  source: "task_analysis" | "risk_policy" | "user_selection" | "dependency_rule" | "system_safeguard" | "context_analysis" | "general_best_practice";
  confidence?: number;
  dependencies?: string[];
}

export interface IntentAnalysisResult {
  taskType: TaskType;
  domain?: string;
  objective?: string;
  riskLevel: RiskLevel;
  complexity: "simple" | "moderate" | "complex";
  
  components: PromptComponentDecision[];
  
  reasoningApproach?: "none" | "concise" | "step_by_step";
  grounding?: "none" | "cited_sources_only" | "internal_knowledge_ok";
  verification?: "none" | "basic" | "rigorous";
  outputFormat?: "text" | "markdown" | "json" | "xml" | "image" | "code";
  
  ragEnabled: boolean;
  toolsEnabled: boolean;
  examplesEnabled: boolean;
  
  suggestedPersona?: PersonaSpec;
  suggestedCommands?: string[];
  
  confidence?: number;
  warnings?: string[];
}

/* ============================================================================
 * TASK CLASSIFICATION
 * ============================================================================ */

const TASK_TYPE_KEYWORDS: Record<TaskType, string[]> = {
  visual_generation: ["image", "picture", "photo", "visual", "render", "illustration", "صورة", "رسم", "تصميم"],
  visual_editing: ["edit", "modify", "enhance", "restore", "remove", "عدل", "حسن", "رمم"],
  text_generation: ["write", "create", "draft", "compose", "اكتب", "انشئ", "صاغ"],
  text_analysis: ["analyze", "review", "evaluate", "assess", "حلل", "راجع", "قيّم"],
  code_generation: ["code", "program", "script", "function", "class", "برمج", "كود", "سكريبت"],
  code_analysis: ["debug", "refactor", "optimize", "review code", "صلح", "حسّن"],
  research: ["research", "investigate", "study", "survey", "ابحث", "ادرس", "تحقق"],
  translation: ["translate", "localize", "ترجم", "حوّل"],
  summarization: ["summarize", "condense", "abstract", "لخص", "اختصر"],
  data_analysis: ["data", "analyze data", "statistics", "chart", "بيانات", "احصائيات", "رسم بياني"],
  creative_writing: ["story", "poem", "novel", "fiction", "قصة", "شعر", "رواية"],
  technical_writing: ["documentation", "manual", "spec", "guide", "توثيق", "دليل", "مواصفة"],
  business_analysis: ["business", "strategy", "market", "financial", "أعمال", "استراتيجية", "سوق"],
  education: ["teach", "learn", "explain", "tutorial", "علّم", "اشرح", "درس"],
  other: [],
};

export function classifyTask(input: string): TaskType {
  const normalized = normalize(input);
  const tokens = new Set(normalized.split(/\s+/));
  
  let taskType: TaskType = "other";
  let maxScore = 0;
  
  for (const [type, keywords] of Object.entries(TASK_TYPE_KEYWORDS)) {
    if (type === "other") continue;
    let score = 0;
    for (const kw of keywords) {
      const normKw = normalize(kw);
      if (normalized.includes(normKw) || tokens.has(normKw)) {
        score += kw.length > 3 ? 2 : 1;
      }
    }
    if (score > maxScore) {
      maxScore = score;
      taskType = type as TaskType;
    }
  }
  
  return taskType;
}

/* ============================================================================
 * RISK ASSESSMENT
 * ============================================================================ */

const RISK_INDICATORS = {
  critical: ["medical", "legal", "financial advice", "safety", "طبي", "قانوني", "مالي", "سلامة"],
  high: ["contract", "compliance", "regulation", "security", "عقد", "امتثال", "تنظيم", "أمن"],
  medium: ["business", "professional", "technical", "أعمال", "مهني", "تقني"],
  low: ["creative", "casual", "personal", "إبداعي", "عادي", "شخصي"],
} as const;

export function assessRisk(taskType: TaskType, input: string): RiskLevel {
  const normalized = normalize(input);
  
  // Task-based risk
  if (taskType === "business_analysis") return "medium";
  
  // Content-based risk
  let riskLevel: RiskLevel = "low";
  
  for (const ind of RISK_INDICATORS.critical) {
    if (normalized.includes(normalize(ind))) {
      riskLevel = "critical";
      break;
    }
  }
  
  if (riskLevel !== "critical") {
    for (const ind of RISK_INDICATORS.high) {
      if (normalized.includes(normalize(ind))) {
        riskLevel = "high";
        break;
      }
    }
  }
  
  if (riskLevel === "low") {
    for (const ind of RISK_INDICATORS.medium) {
      if (normalized.includes(normalize(ind))) {
        riskLevel = "medium";
        break;
      }
    }
  }
  
  return riskLevel;
}

/* ============================================================================
 * COMPONENT SELECTION
 * ============================================================================ */

export function selectComponents(
  taskType: TaskType,
  riskLevel: RiskLevel,
  context: { attachedFiles: number; contextSources: number }
): PromptComponentDecision[] {
  const decisions: PromptComponentDecision[] = [];
  
  const makeDecision = (
    component: string,
    status: ComponentStatus,
    reason: string,
    source: PromptComponentDecision["source"],
    confidence?: number,
    dependencies?: string[]
  ): PromptComponentDecision => ({
    component,
    status,
    reason,
    source,
    confidence,
    dependencies,
  });
  
  // Core components - always required
  decisions.push(makeDecision(
    "objective",
    "required",
    "Every prompt must have a clear objective",
    "system_safeguard",
    1.0
  ));
  
  decisions.push(makeDecision(
    "output",
    "required",
    "Every prompt must specify expected output format",
    "system_safeguard",
    1.0
  ));
  
  // Role/Persona
  if (taskType === "creative_writing" || taskType === "technical_writing") {
    decisions.push(makeDecision(
      "role",
      "recommended",
      `Writing tasks benefit from a defined persona (${taskType})`,
      "task_analysis",
      0.8
    ));
  } else if (riskLevel === "high" || riskLevel === "critical") {
    decisions.push(makeDecision(
      "role",
      "required",
      "High-risk tasks require explicit role definition for accountability",
      "risk_policy",
      0.95
    ));
  } else {
    decisions.push(makeDecision(
      "role",
      "optional",
      "Persona is optional for this task type and risk level",
      "task_analysis",
      0.6
    ));
  }
  
  // Context
  if (taskType === "research" || taskType === "text_analysis" || taskType === "data_analysis") {
    decisions.push(makeDecision(
      "context",
      "required",
      "Analytical tasks require explicit context",
      "task_analysis",
      0.9
    ));
  } else if (context.contextSources > 0 || context.attachedFiles > 0) {
    decisions.push(makeDecision(
      "context",
      "required",
      "User provided explicit inputs that must be referenced",
      "context_analysis",
      0.95
    ));
  } else {
    decisions.push(makeDecision(
      "context",
      "recommended",
      "Context improves relevance but is not mandatory",
      "task_analysis",
      0.7
    ));
  }
  
  // Constraints
  if (riskLevel === "high" || riskLevel === "critical") {
    decisions.push(makeDecision(
      "constraints",
      "required",
      "High-risk tasks require explicit constraints",
      "risk_policy",
      0.95
    ));
  } else if (taskType === "code_generation" || taskType === "visual_generation") {
    decisions.push(makeDecision(
      "constraints",
      "recommended",
      "Technical/creative tasks benefit from constraints",
      "task_analysis",
      0.75
    ));
  } else {
    decisions.push(makeDecision(
      "constraints",
      "recommended",
      "Constraints improve controllability",
      "general_best_practice",
      0.6
    ));
  }
  
  // Grounding & Evidence
  if (taskType === "research" || taskType === "text_analysis") {
    decisions.push(makeDecision(
      "grounding",
      "required",
      "Research/analysis tasks require evidence grounding",
      "task_analysis",
      0.95
    ));
    decisions.push(makeDecision(
      "evidencePolicy",
      "required",
      "Research/analysis tasks require explicit evidence policy",
      "task_analysis",
      0.95
    ));
  } else if (riskLevel === "high" || riskLevel === "critical") {
    decisions.push(makeDecision(
      "grounding",
      "recommended",
      "High-risk tasks benefit from grounding",
      "risk_policy",
      0.8
    ));
    decisions.push(makeDecision(
      "evidencePolicy",
      "recommended",
      "High-risk tasks benefit from explicit evidence policy",
      "risk_policy",
      0.8
    ));
  } else {
    decisions.push(makeDecision(
      "grounding",
      "not_applicable",
      "Grounding not required for this task type and risk level",
      "task_analysis",
      0.7
    ));
    decisions.push(makeDecision(
      "evidencePolicy",
      "not_applicable",
      "Evidence policy not required for this task type and risk level",
      "task_analysis",
      0.7
    ));
  }
  
  // Verification
  if (riskLevel === "high" || riskLevel === "critical") {
    decisions.push(makeDecision(
      "verification",
      "required",
      "Factual claims must be validated in high-risk tasks",
      "risk_policy",
      0.95
    ));
  } else if (taskType === "research" || taskType === "text_analysis") {
    decisions.push(makeDecision(
      "verification",
      "recommended",
      "Verification improves reliability",
      "task_analysis",
      0.8
    ));
  } else {
    decisions.push(makeDecision(
      "verification",
      "optional",
      "Not critical for this task type",
      "task_analysis",
      0.5
    ));
  }
  
  // Reasoning
  if (taskType === "code_analysis" || taskType === "text_analysis") {
    decisions.push(makeDecision(
      "reasoningApproach",
      "recommended",
      "Analytical tasks benefit from structured reasoning",
      "task_analysis",
      0.8
    ));
  } else {
    decisions.push(makeDecision(
      "reasoningApproach",
      "not_applicable",
      "Reasoning approach not needed for this task type",
      "task_analysis",
      0.6
    ));
  }
  
  // Failure Handling
  if (riskLevel === "high" || riskLevel === "critical") {
    decisions.push(makeDecision(
      "failureHandling",
      "required",
      "High-risk tasks require explicit failure handling",
      "risk_policy",
      0.95
    ));
  } else {
    decisions.push(makeDecision(
      "failureHandling",
      "optional",
      "Failure handling is optional for this risk level",
      "task_analysis",
      0.5
    ));
  }
  
  // Security
  if (riskLevel === "critical") {
    decisions.push(makeDecision(
      "security",
      "required",
      "Critical-risk tasks require explicit security specification",
      "risk_policy",
      1.0
    ));
  } else if (riskLevel === "high") {
    decisions.push(makeDecision(
      "security",
      "recommended",
      "High-risk tasks benefit from security specification",
      "risk_policy",
      0.85
    ));
  } else {
    decisions.push(makeDecision(
      "security",
      "auto",
      "Security safeguards are always applied at system level",
      "system_safeguard",
      1.0
    ));
  }
  
  // Tools
  decisions.push(makeDecision(
    "tools",
    "not_applicable",
    "Tool policy not applicable in current execution environment",
    "system_safeguard",
    1.0
  ));
  
  // RAG
  decisions.push(makeDecision(
    "rag",
    "not_applicable",
    "RAG not available in current execution environment",
    "system_safeguard",
    1.0
  ));
  
  // Workflow
  if (taskType === "business_analysis" || taskType === "research") {
    decisions.push(makeDecision(
      "workflow",
      "recommended",
      "Complex tasks benefit from explicit workflow",
      "task_analysis",
      0.75
    ));
  } else {
    decisions.push(makeDecision(
      "workflow",
      "not_applicable",
      "Workflow not needed for simple/moderate tasks",
      "task_analysis",
      0.6
    ));
  }
  
  // Quality Criteria
  if (riskLevel === "high" || riskLevel === "critical") {
    decisions.push(makeDecision(
      "qualityCriteria",
      "recommended",
      "High-risk tasks benefit from quality criteria",
      "task_analysis",
      0.8
    ));
  } else {
    decisions.push(makeDecision(
      "qualityCriteria",
      "optional",
      "Quality criteria are optional for this task",
      "task_analysis",
      0.5
    ));
  }
  
  // Examples
  if (taskType === "code_generation" || taskType === "visual_generation") {
    decisions.push(makeDecision(
      "examples",
      "recommended",
      "Technical/creative tasks benefit from examples",
      "task_analysis",
      0.75
    ));
  } else {
    decisions.push(makeDecision(
      "examples",
      "optional",
      "Examples are optional for this task type",
      "task_analysis",
      0.5
    ));
  }
  
  // Evaluation (always recommended for governance)
  decisions.push(makeDecision(
    "evaluation",
    "recommended",
    "Evaluation is recommended for governance and traceability",
    "system_safeguard",
    0.9
  ));
  
  return decisions;
}

/* ============================================================================
 * DEPENDENCY RESOLUTION
 * ============================================================================ */

export function resolveDependencies(decisions: PromptComponentDecision[]): PromptComponentDecision[] {
  const map = new Map(decisions.map(d => [d.component, d]));
  
  const ensureRequired = (component: string, reason: string) => {
    const existing = map.get(component);
    if (!existing || existing.status === "not_applicable" || existing.status === "optional") {
      map.set(component, {
        component,
        status: "required",
        reason,
        source: "dependency_rule",
        confidence: 0.95,
      });
    }
  };
  
  // Check for RAG
  const hasRag = decisions.some(d => d.component === "rag" && d.status !== "not_applicable");
  if (hasRag) {
    ensureRequired("grounding", "RAG requires explicit grounding policy");
    ensureRequired("evidencePolicy", "RAG requires source policy");
  }
  
  // Check for Tools
  const hasTools = decisions.some(d => d.component === "tools" && d.status !== "not_applicable");
  if (hasTools) {
    ensureRequired("security", "Tools require explicit security policy");
  }
  
  // Check for structured output
  const hasStructuredOutput = decisions.some(
    d => d.component === "output" && d.status === "required"
  );
  if (hasStructuredOutput) {
    // Output format is already required, no additional dependencies
  }
  
  return Array.from(map.values());
}

/* ============================================================================
 * PERSONA SUGGESTION
 * ============================================================================ */

const PERSONA_SUGGESTIONS: Record<TaskType, PersonaSpec> = {
  visual_generation: {
    id: "visual_artist",
    name: { ar: "فنان بصري محترف", en: "Professional Visual Artist" },
    description: { ar: "خبير في التوليد البصري والتصميم", en: "Expert in visual generation and design" },
    domain: "visual",
    expertise: ["composition", "color_theory", "lighting", "style"],
    tone: "creative",
    source: "system",
  },
  visual_editing: {
    id: "photo_editor",
    name: { ar: "محرر صور محترف", en: "Professional Photo Editor" },
    description: { ar: "خبير في تحرير وتحسين الصور", en: "Expert in photo editing and enhancement" },
    domain: "visual",
    expertise: ["retouching", "color_correction", "restoration"],
    tone: "technical",
    source: "system",
  },
  text_generation: {
    id: "professional_writer",
    name: { ar: "كاتب محترف", en: "Professional Writer" },
    description: { ar: "خبير في الكتابة الإبداعية والتقنية", en: "Expert in creative and technical writing" },
    domain: "writing",
    expertise: ["storytelling", "editing", "style"],
    tone: "professional",
    source: "system",
  },
  text_analysis: {
    id: "analyst",
    name: { ar: "محلل نصوص", en: "Text Analyst" },
    description: { ar: "خبير في تحليل النصوص واستخراج المعاني", en: "Expert in text analysis and meaning extraction" },
    domain: "analysis",
    expertise: ["critical_thinking", "pattern_recognition", "synthesis"],
    tone: "academic",
    source: "system",
  },
  code_generation: {
    id: "software_engineer",
    name: { ar: "مهندس برمجيات", en: "Software Engineer" },
    description: { ar: "خبير في تطوير البرمجيات وكتابة الكود", en: "Expert in software development and coding" },
    domain: "technology",
    expertise: ["algorithms", "design_patterns", "best_practices"],
    tone: "technical",
    source: "system",
  },
  code_analysis: {
    id: "code_reviewer",
    name: { ar: "مراجع كود", en: "Code Reviewer" },
    description: { ar: "خبير في مراجعة وتحليل الكود", en: "Expert in code review and analysis" },
    domain: "technology",
    expertise: ["debugging", "optimization", "security"],
    tone: "technical",
    source: "system",
  },
  research: {
    id: "researcher",
    name: { ar: "باحث أكاديمي", en: "Academic Researcher" },
    description: { ar: "خبير في البحث العلمي والتحليل الأكاديمي", en: "Expert in scientific research and academic analysis" },
    domain: "research",
    expertise: ["methodology", "citation", "critical_analysis"],
    tone: "academic",
    source: "system",
  },
  translation: {
    id: "translator",
    name: { ar: "مترجم محترف", en: "Professional Translator" },
    description: { ar: "خبير في الترجمة والتوطين", en: "Expert in translation and localization" },
    domain: "languages",
    expertise: ["bilingual", "cultural_context", "terminology"],
    tone: "professional",
    source: "system",
  },
  summarization: {
    id: "summarizer",
    name: { ar: "ملخص نصوص", en: "Text Summarizer" },
    description: { ar: "خبير في تلخيص النصوص واستخراج النقاط الرئيسية", en: "Expert in text summarization and key point extraction" },
    domain: "writing",
    expertise: ["conciseness", "clarity", "hierarchy"],
    tone: "concise",
    source: "system",
  },
  data_analysis: {
    id: "data_scientist",
    name: { ar: "عالم بيانات", en: "Data Scientist" },
    description: { ar: "خبير في تحليل البيانات والإحصاء", en: "Expert in data analysis and statistics" },
    domain: "data",
    expertise: ["statistics", "visualization", "insights"],
    tone: "technical",
    source: "system",
  },
  creative_writing: {
    id: "creative_writer",
    name: { ar: "كاتب إبداعي", en: "Creative Writer" },
    description: { ar: "خبير في الكتابة الإبداعية والسرد", en: "Expert in creative writing and storytelling" },
    domain: "creative",
    expertise: ["narrative", "character", "style"],
    tone: "creative",
    source: "system",
  },
  technical_writing: {
    id: "technical_writer",
    name: { ar: "كاتب تقني", en: "Technical Writer" },
    description: { ar: "خبير في الكتابة التقنية والتوثيق", en: "Expert in technical writing and documentation" },
    domain: "technical",
    expertise: ["clarity", "structure", "accuracy"],
    tone: "technical",
    source: "system",
  },
  business_analysis: {
    id: "business_analyst",
    name: { ar: "محلل أعمال", en: "Business Analyst" },
    description: { ar: "خبير في تحليل الأعمال والاستراتيجية", en: "Expert in business analysis and strategy" },
    domain: "business",
    expertise: ["strategy", "market_analysis", "financial_modeling"],
    tone: "executive",
    source: "system",
  },
  education: {
    id: "educator",
    name: { ar: "معلم خبير", en: "Expert Educator" },
    description: { ar: "خبير في التعليم والتدريب", en: "Expert in education and training" },
    domain: "education",
    expertise: ["pedagogy", "clarity", "engagement"],
    tone: "professional",
    source: "system",
  },
  other: {
    id: "general_assistant",
    name: { ar: "مساعد عام", en: "General Assistant" },
    description: { ar: "مساعد متعدد المهارات", en: "Versatile general assistant" },
    domain: "general",
    expertise: ["adaptability", "clarity"],
    tone: "professional",
    source: "system",
  },
};

export function suggestPersona(taskType: TaskType): PersonaSpec {
  return PERSONA_SUGGESTIONS[taskType] || PERSONA_SUGGESTIONS.other;
}

/* ============================================================================
 * MAIN INTENT ANALYZER
 * ============================================================================ */

export function analyzeIntent(input: IntentAnalyzerInput): IntentAnalysisResult {
  const { userText, language, contextSources, attachedFiles } = input;
  
  // Step 1: Classify task
  const taskType = classifyTask(userText);
  
  // Step 2: Assess risk
  const riskLevel = assessRisk(taskType, userText);
  
  // Step 3: Determine complexity
  const complexity: "simple" | "moderate" | "complex" = 
    userText.length > 500 ? "complex" :
    userText.length > 150 ? "moderate" : "simple";
  
  // Step 4: Select components
  let components = selectComponents(taskType, riskLevel, {
    attachedFiles: attachedFiles.length,
    contextSources: contextSources.length,
  });
  
  // Step 5: Resolve dependencies
  components = resolveDependencies(components);
  
  // Step 6: Suggest persona
  const suggestedPersona = suggestPersona(taskType);
  
  // Step 7: Determine output format
  let outputFormat: IntentAnalysisResult["outputFormat"] = "text";
  if (taskType === "visual_generation" || taskType === "visual_editing") {
    outputFormat = "image";
  } else if (taskType === "code_generation" || taskType === "code_analysis") {
    outputFormat = "code";
  } else if (taskType === "data_analysis") {
    outputFormat = "markdown";
  }
  
  // Step 8: Determine reasoning approach
  let reasoningApproach: IntentAnalysisResult["reasoningApproach"] = "none";
  if (taskType === "code_analysis" || taskType === "text_analysis") {
    reasoningApproach = "concise";
  }
  
  // Step 9: Determine grounding
  let grounding: IntentAnalysisResult["grounding"] = "none";
  if (taskType === "research" || taskType === "text_analysis") {
    grounding = "cited_sources_only";
  } else if (riskLevel === "high" || riskLevel === "critical") {
    grounding = "cited_sources_only";
  }
  
  // Step 10: Determine verification
  let verification: IntentAnalysisResult["verification"] = "none";
  if (riskLevel === "high" || riskLevel === "critical") {
    verification = "rigorous";
  } else if (taskType === "research" || taskType === "text_analysis") {
    verification = "basic";
  }
  
  // Step 11: Calculate confidence
  const requiredCount = components.filter(c => c.status === "required").length;
  const totalComponents = components.length;
  const confidence = Math.round((requiredCount / totalComponents) * 100);
  
  // Step 12: Generate warnings
  const warnings: string[] = [];
  if (userText.length < 20) {
    warnings.push("Input is very short - may lack sufficient detail");
  }
  if (riskLevel === "high" || riskLevel === "critical") {
    warnings.push("High-risk task detected - additional verification recommended");
  }
  
  return {
    taskType,
    riskLevel,
    complexity,
    components,
    reasoningApproach,
    grounding,
    verification,
    outputFormat,
    ragEnabled: false,
    toolsEnabled: false,
    examplesEnabled: components.some(c => c.component === "examples" && c.status !== "not_applicable"),
    suggestedPersona,
    confidence,
    warnings: warnings.length > 0 ? warnings : undefined,
  };
}
