/* ============================================================================
 * PROMPT WORKSPACE PANEL
 * ============================================================================
 * Unified workspace for prompt engineering lifecycle:
 * Intent → Specification → Compilation → Validation → Release
 * 
 * Supports three modes:
 * - Quick: Simple interface for daily requests
 * - Expert: Full specification control
 * - Enterprise: Versions, tests, governance
 * ============================================================================ */

import { useState, useMemo } from "react";
import { analyzeIntent, type IntentAnalysisResult } from "../lib/prompt/intentAnalyzer";
import { getRegistry, type PromptAsset, type PromptVersion } from "../lib/prompt/registry";
import { getRedTeamEngine, type RedTeamRun } from "../lib/prompt/redTeam";
import { getEvaluationEngine, type TestRun } from "../lib/prompt/evaluation";
import { useApp } from "../lib/i18n";
import { Icon } from "./Icons";

type Mode = "quick" | "expert" | "enterprise";

interface Props {
  userText: string;
  attachedFiles: Array<{ name: string; type: string }>;
  onGenerated?: (prompt: string) => void;
}

export function WorkspacePanel({ userText, attachedFiles, onGenerated }: Props) {
  const { t, locale } = useApp();
  const [mode, setMode] = useState<Mode>("quick");
  const [activeTab, setActiveTab] = useState<"intent" | "specification" | "compiled" | "validation" | "registry">("intent");
  
  // Analyze intent
  const analysis = useMemo<IntentAnalysisResult | null>(() => {
    if (!userText.trim()) return null;
    return analyzeIntent({
      userText,
      language: locale,
      contextSources: [],
      attachedFiles,
    });
  }, [userText, attachedFiles, locale]);
  
  if (!analysis) {
    return (
      <div className="glass rounded-xl p-6 text-center text-dim">
        <Icon name="spark" className="w-8 h-8 mx-auto mb-2 opacity-40" />
        <p>{locale === "ar" ? "اكتب طلبك لرؤية التحليل" : "Type your request to see the analysis"}</p>
      </div>
    );
  }
  
  return (
    <div className="glass rounded-xl overflow-hidden">
      {/* Mode Switcher */}
      <div className="border-b border-line p-3 flex items-center gap-2">
        <span className="text-xs text-dim font-semibold">{t("workspace")}:</span>
        <div className="flex gap-1">
          {(["quick", "expert", "enterprise"] as Mode[]).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                mode === m
                  ? "bg-amber/20 text-amber border border-amber/40"
                  : "text-mute hover:text-ink border border-transparent"
              }`}
            >
              {t(`mode${m.charAt(0).toUpperCase() + m.slice(1)}` as any)}
            </button>
          ))}
        </div>
        <div className="mr-auto text-[10px] text-dim">
          {t(`mode${mode.charAt(0).toUpperCase() + mode.slice(1)}Desc` as any)}
        </div>
      </div>
      
      {/* Tab Navigation */}
      <div className="border-b border-line flex overflow-x-auto">
        {[
          { id: "intent", icon: "spark", label: t("intent") },
          { id: "specification", icon: "layers", label: t("specification") },
          ...(mode !== "quick" ? [
            { id: "compiled" as const, icon: "code", label: t("compiled") },
            { id: "validation" as const, icon: "check", label: t("validation") },
          ] : []),
          ...(mode === "enterprise" ? [
            { id: "registry" as const, icon: "book", label: t("registry") },
          ] : []),
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors ${
              activeTab === tab.id
                ? "border-amber text-amber"
                : "border-transparent text-mute hover:text-ink"
            }`}
          >
            <Icon name={tab.icon as any} className="w-3.5 h-3.5" />
            {tab.label}
          </button>
        ))}
      </div>
      
      {/* Tab Content */}
      <div className="p-4">
        {activeTab === "intent" && <IntentTab analysis={analysis} locale={locale} />}
        {activeTab === "specification" && <SpecificationTab analysis={analysis} locale={locale} />}
        {activeTab === "compiled" && mode !== "quick" && <CompiledTab analysis={analysis} userText={userText} locale={locale} />}
        {activeTab === "validation" && mode !== "quick" && <ValidationTab analysis={analysis} locale={locale} />}
        {activeTab === "registry" && mode === "enterprise" && <RegistryTab locale={locale} />}
      </div>
    </div>
  );
}

/* ============================================================================
 * TAB COMPONENTS
 * ============================================================================ */

function IntentTab({ analysis, locale }: { analysis: IntentAnalysisResult; locale: "ar" | "en" }) {
  const { t } = useApp();
  
  return (
    <div className="space-y-4">
      {/* Task Analysis */}
      <div className="grid grid-cols-2 gap-3">
        <InfoCard label={locale === "ar" ? "نوع المهمة" : "Task Type"} value={analysis.taskType} />
        <InfoCard label={locale === "ar" ? "مستوى المخاطرة" : "Risk Level"} value={analysis.riskLevel} color={
          analysis.riskLevel === "critical" ? "text-red" :
          analysis.riskLevel === "high" ? "text-orange" :
          analysis.riskLevel === "medium" ? "text-yellow" : "text-green"
        } />
        <InfoCard label={locale === "ar" ? "التعقيد" : "Complexity"} value={analysis.complexity} />
        <InfoCard label={locale === "ar" ? "الثقة" : "Confidence"} value={`${analysis.confidence}%`} />
      </div>
      
      {/* Suggested Persona */}
      {analysis.suggestedPersona && (
        <div className="glass-inner rounded-lg p-3">
          <p className="text-xs text-dim mb-1">{locale === "ar" ? "الشخصية المقترحة" : "Suggested Persona"}</p>
          <p className="text-sm font-semibold">{analysis.suggestedPersona.name[locale]}</p>
          <p className="text-xs text-mute mt-1">{analysis.suggestedPersona.description[locale]}</p>
        </div>
      )}
      
      {/* Warnings */}
      {analysis.warnings && analysis.warnings.length > 0 && (
        <div className="glass-inner rounded-lg p-3 border border-orange/30 bg-orange/5">
          <p className="text-xs text-orange font-semibold mb-1">⚠️ {locale === "ar" ? "تحذيرات" : "Warnings"}</p>
          <ul className="text-xs text-mute space-y-0.5">
            {analysis.warnings.map((w, i) => <li key={i}>• {w}</li>)}
          </ul>
        </div>
      )}
    </div>
  );
}

function SpecificationTab({ analysis, locale }: { analysis: IntentAnalysisResult; locale: "ar" | "en" }) {
  const { t } = useApp();
  
  const grouped = {
    core: analysis.components.filter(c => ["objective", "output", "role", "context", "constraints"].includes(c.component)),
    trust: analysis.components.filter(c => ["grounding", "evidencePolicy", "verification"].includes(c.component)),
    output: analysis.components.filter(c => ["outputFormat", "examples", "qualityCriteria"].includes(c.component)),
    security: analysis.components.filter(c => ["security", "failureHandling"].includes(c.component)),
    other: analysis.components.filter(c => !["objective", "output", "role", "context", "constraints", "grounding", "evidencePolicy", "verification", "outputFormat", "examples", "qualityCriteria", "security", "failureHandling"].includes(c.component)),
  };
  
  return (
    <div className="space-y-4">
      {Object.entries(grouped).map(([group, components]) => {
        if (components.length === 0) return null;
        return (
          <div key={group}>
            <p className="text-xs font-bold text-amber mb-2 uppercase">{group}</p>
            <div className="space-y-1">
              {components.map((c) => (
                <ComponentRow key={c.component} component={c} locale={locale} />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function CompiledTab({ analysis, userText, locale }: { analysis: IntentAnalysisResult; userText: string; locale: "ar" | "en" }) {
  const { t } = useApp();
  
  // Generate compiled prompt (simplified version)
  const compiled = useMemo(() => {
    const lines: string[] = [];
    
    lines.push(`# ${locale === "ar" ? "البروتوكول التنفيذي" : "Execution Protocol"}`);
    lines.push("");
    lines.push(`## ${locale === "ar" ? "النية" : "Intent"}`);
    lines.push(userText);
    lines.push("");
    lines.push(`## ${locale === "ar" ? "تحليل المهمة" : "Task Analysis"}`);
    lines.push(`- ${locale === "ar" ? "نوع المهمة" : "Task Type"}: ${analysis.taskType}`);
    lines.push(`- ${locale === "ar" ? "مستوى المخاطرة" : "Risk Level"}: ${analysis.riskLevel}`);
    lines.push(`- ${locale === "ar" ? "التعقيد" : "Complexity"}: ${analysis.complexity}`);
    lines.push("");
    
    if (analysis.suggestedPersona) {
      lines.push(`## ${locale === "ar" ? "الشخصية" : "Persona"}`);
      lines.push(analysis.suggestedPersona.name[locale]);
      lines.push(analysis.suggestedPersona.description[locale]);
      lines.push("");
    }
    
    lines.push(`## ${locale === "ar" ? "المكونات المطلوبة" : "Required Components"}`);
    const required = analysis.components.filter(c => c.status === "required");
    required.forEach(c => {
      lines.push(`- ${c.component}: ${c.reason}`);
    });
    
    return lines.join("\n");
  }, [analysis, userText, locale]);
  
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-dim">{locale === "ar" ? "البرومبت المُجمَّع" : "Compiled Prompt"}</p>
        <button
          onClick={() => navigator.clipboard.writeText(compiled)}
          className="btn-press px-2 py-1 rounded text-xs text-teal hover:bg-teal/10"
        >
          {locale === "ar" ? "نسخ" : "Copy"}
        </button>
      </div>
      <pre className="glass-inner rounded-lg p-3 text-xs font-mono whitespace-pre-wrap overflow-x-auto max-h-96 overflow-y-auto">
        {compiled}
      </pre>
    </div>
  );
}

function ValidationTab({ analysis, locale }: { analysis: IntentAnalysisResult; locale: "ar" | "en" }) {
  const { t } = useApp();
  const [redTeamRun, setRedTeamRun] = useState<RedTeamRun | null>(null);
  const [testRun, setTestRun] = useState<TestRun | null>(null);
  
  const runRedTeam = () => {
    const engine = getRedTeamEngine();
    // Create a mock version for analysis
    const mockVersion = {
      id: "mock",
      assetId: "mock",
      version: "1.0.0",
      originalIntent: "",
      specification: {
        intent: "",
        objective: "",
        context: { available: [], selected: [], actuallyUsed: [] },
        inputs: [],
        constraints: [],
        output: { format: "text" },
        qualityCriteria: [],
        failureHandling: { onMissingInput: "ask", onAmbiguity: "ask", onSecurityViolation: "refuse" },
        security: { injectionProtection: true, dataLeakageProtection: true, sensitiveDataPolicy: "redact" },
        evaluation: { functionalTests: [], redTeamRuns: [], regressionTests: [], executionStatus: "not_executed" },
        metadata: { assetId: "mock", version: "1.0.0", createdAt: "", updatedAt: "" },
      } as any,
      compiledPrompt: "",
      changeSummary: "",
      readinessStatus: "not_evaluated" as const,
      status: "draft" as const,
      createdAt: "",
    };
    const run = engine.runAnalysis(mockVersion);
    setRedTeamRun(run);
  };
  
  const runTests = () => {
    const engine = getEvaluationEngine();
    const mockVersion = {
      id: "mock",
      assetId: "mock",
      version: "1.0.0",
      originalIntent: "",
      specification: {
        intent: "",
        objective: "Test objective",
        context: { available: [], selected: [], actuallyUsed: [] },
        inputs: [],
        constraints: [],
        output: { format: "text" },
        qualityCriteria: [],
        failureHandling: { onMissingInput: "ask", onAmbiguity: "ask", onSecurityViolation: "refuse" },
        security: { injectionProtection: true, dataLeakageProtection: true, sensitiveDataPolicy: "redact" },
        evaluation: { functionalTests: [], redTeamRuns: [], regressionTests: [], executionStatus: "not_executed" },
        metadata: { assetId: "mock", version: "1.0.0", createdAt: "", updatedAt: "" },
      } as any,
      compiledPrompt: "Test prompt",
      changeSummary: "",
      readinessStatus: "not_evaluated" as const,
      status: "draft" as const,
      createdAt: "",
    };
    const run = engine.runEvaluation(mockVersion);
    setTestRun(run);
  };
  
  return (
    <div className="space-y-4">
      {/* Red Team */}
      <div className="glass-inner rounded-lg p-3">
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-semibold">{t("redteam")}</p>
          <button onClick={runRedTeam} className="btn-press px-2 py-1 rounded text-xs text-coral hover:bg-coral/10">
            {locale === "ar" ? "تشغيل" : "Run"}
          </button>
        </div>
        {redTeamRun ? (
          <div className="text-xs space-y-1">
            <p>{locale === "ar" ? "الحالة" : "Status"}: <span className="text-amber">{t("staticAnalysis")}</span></p>
            <p>{locale === "ar" ? "الإجمالي" : "Total"}: {redTeamRun.summary.total}</p>
            <p>{locale === "ar" ? "النتائج" : "Findings"}: {redTeamRun.findings.length}</p>
          </div>
        ) : (
          <p className="text-xs text-dim">{t("notExecuted")}</p>
        )}
      </div>
      
      {/* Tests */}
      <div className="glass-inner rounded-lg p-3">
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-semibold">{t("tests")}</p>
          <button onClick={runTests} className="btn-press px-2 py-1 rounded text-xs text-teal hover:bg-teal/10">
            {locale === "ar" ? "تشغيل" : "Run"}
          </button>
        </div>
        {testRun ? (
          <div className="text-xs space-y-1">
            <p>{locale === "ar" ? "الحالة" : "Status"}: <span className="text-amber">{t("staticAnalysis")}</span></p>
            <p>{locale === "ar" ? "النتائج" : "Metrics"}:</p>
            {testRun.metrics.correctness !== undefined && (
              <p className="mr-2">• Correctness: {testRun.metrics.correctness.toFixed(0)}%</p>
            )}
            {testRun.metrics.coverage !== undefined && (
              <p className="mr-2">• Coverage: {testRun.metrics.coverage.toFixed(0)}%</p>
            )}
          </div>
        ) : (
          <p className="text-xs text-dim">{t("notExecuted")}</p>
        )}
      </div>
    </div>
  );
}

function RegistryTab({ locale }: { locale: "ar" | "en" }) {
  const { t } = useApp();
  const registry = getRegistry();
  const assets = registry.listAssets();
  
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold">{t("assets")}</p>
        <button
          onClick={() => {
            const name = prompt(locale === "ar" ? "اسم الأصل:" : "Asset name:");
            if (name) {
              registry.createAsset({ name });
              window.location.reload(); // Simple refresh
            }
          }}
          className="btn-press px-2 py-1 rounded text-xs text-amber hover:bg-amber/10"
        >
          + {t("newAsset")}
        </button>
      </div>
      
      {assets.length === 0 ? (
        <p className="text-xs text-dim text-center py-4">
          {locale === "ar" ? "لا توجد أصول بعد" : "No assets yet"}
        </p>
      ) : (
        <div className="space-y-1">
          {assets.map((asset) => (
            <div key={asset.id} className="glass-inner rounded-lg p-2 flex items-center gap-2">
              <Icon name="file" className="w-4 h-4 text-dim" />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold truncate">{asset.name}</p>
                <p className="text-[10px] text-dim">{asset.status}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ============================================================================
 * HELPER COMPONENTS
 * ============================================================================ */

function InfoCard({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="glass-inner rounded-lg p-2">
      <p className="text-[10px] text-dim">{label}</p>
      <p className={`text-sm font-semibold ${color || "text-ink"}`}>{value}</p>
    </div>
  );
}

function ComponentRow({ component, locale }: { component: any; locale: "ar" | "en" }) {
  const { t } = useApp();
  
  const status = component.status as "required" | "recommended" | "optional" | "not_applicable" | "auto";
  
  const statusColor: Record<string, string> = {
    required: "text-green",
    recommended: "text-amber",
    optional: "text-dim",
    not_applicable: "text-dim line-through",
    auto: "text-teal",
  };
  
  const statusIcon: Record<string, string> = {
    required: "✓",
    recommended: "★",
    optional: "○",
    not_applicable: "—",
    auto: "⚙",
  };
  
  const color = statusColor[status] || "text-dim";
  const icon = statusIcon[status] || "—";
  
  return (
    <div className="flex items-start gap-2 text-xs">
      <span className={color}>{icon}</span>
      <div className="flex-1 min-w-0">
        <p className="font-semibold">{component.component}</p>
        <p className="text-[10px] text-dim">{component.reason}</p>
      </div>
      <span className={`text-[10px] font-semibold ${color}`}>
        {t(status as any)}
      </span>
    </div>
  );
}
