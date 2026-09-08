import { describe, it, expect } from "vitest";
import { analyzeIntent, decideComponents } from "./decisionEngine";

describe("Decision Engine", () => {
  describe("analyzeIntent", () => {
    it("should detect visual_generation task type", () => {
      const result = analyzeIntent("Create an image of a sunset", "en");
      expect(result.taskType).toBe("visual_generation");
      expect(result.executionStatus).toBe("measured");
    });

    it("should detect Arabic input", () => {
      const result = analyzeIntent("أنشئ صورة لغروب الشمس", "ar");
      expect(result.taskType).toBe("visual_generation");
      expect(result.detectedLanguage).toBe("ar");
    });

    it("should identify high risk for medical content", () => {
      const result = analyzeIntent("Provide medical advice for heart disease", "en");
      expect(result.riskLevel).toBe("critical");
    });

    it("should detect complexity based on input length", () => {
      const shortInput = "Draw a cat";
      // Need > 500 chars for complex
      const longInput = "Create a highly detailed illustration with multiple elements including background, foreground, lighting effects, shadows, reflections, and intricate patterns that demonstrate professional artistic technique with comprehensive analysis and detailed explanations for each component. This task requires careful consideration of color theory, composition rules, perspective guidelines, lighting principles, texture rendering, atmospheric effects, depth cues, visual hierarchy, balance, contrast, harmony, rhythm, emphasis, proportion, scale, unity, variety, movement, flow, focal points, negative space, positive space, figure-ground relationships, gestalt principles, semantic meaning, emotional impact, cultural context, historical references, stylistic conventions, technical execution, material properties, surface qualities, volumetric form, spatial relationships, temporal dynamics, narrative structure, symbolic content, aesthetic judgment, critical evaluation, iterative refinement, and final polish.";
      
      expect(analyzeIntent(shortInput).complexity).toBe("simple");
      expect(analyzeIntent(longInput).complexity).toBe("complex");
    });

    it("should flag ambiguous short input", () => {
      const result = analyzeIntent("thing", "en");
      expect(result.ambiguityFlags).toContain("very_short_input");
    });
  });

  describe("decideComponents", () => {
    it("should always require objective and output", () => {
      const intent = analyzeIntent("Simple task", "en");
      const decisions = decideComponents(intent);
      
      const objective = decisions.find(d => d.component === "objective");
      const output = decisions.find(d => d.component === "output");
      
      expect(objective?.status).toBe("required");
      expect(output?.status).toBe("required");
    });

    it("should require security for critical risk", () => {
      const intent = analyzeIntent("Medical diagnosis assistance", "en");
      const decisions = decideComponents(intent);
      
      const security = decisions.find(d => d.component === "security");
      expect(security?.status).toBe("required");
    });

    it("should recommend grounding for research tasks", () => {
      const intent = analyzeIntent("Research climate change impacts", "en");
      const decisions = decideComponents(intent);
      
      const grounding = decisions.find(d => d.component === "grounding");
      expect(grounding?.status).toBe("required");
    });

    it("should provide evidence-backed decisions", () => {
      const intent = analyzeIntent("Write a story", "en");
      const decisions = decideComponents(intent);
      
      const roleDecision = decisions.find(d => d.component === "role");
      expect(roleDecision?.evidence).toBeDefined();
      expect(roleDecision?.evidence?.status).toMatchInlineSnapshot('"estimated"');
    });

    it("should include trace information for policy-enforced decisions", () => {
      const intent = analyzeIntent("Legal contract review", "en");
      const decisions = decideComponents(intent);
      
      // Security component should have trace for high-risk tasks
      const security = decisions.find(d => d.component === "security");
      expect(security?.trace).toBeDefined();
      expect(security?.trace?.policyId).toBeDefined();
    });
  });
});
