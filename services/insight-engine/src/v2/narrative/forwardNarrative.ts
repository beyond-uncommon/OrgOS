import Groq from "groq-sdk";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { env } from "@orgos/utils";
import type { ForwardRiskSignal, OpportunitySignal, RiskEscalationForecast } from "@orgos/shared-types";

const MODEL = "llama-3.3-70b-versatile";
const PROMPT_FILE = "forecast-v1.md";
export const PROMPT_VERSION = PROMPT_FILE.replace(".md", "");

interface ForwardNarrativeInput {
  departmentId: string;
  forwardRisks: ForwardRiskSignal[];
  escalations: RiskEscalationForecast[];
  opportunities: OpportunitySignal[];
  recommendations: string[];
}

/**
 * Claude formats the pre-computed forward signals into a coherent forecast narrative.
 * It receives only the structured predictions — it cannot change them.
 */
export async function generateForwardNarrative(input: ForwardNarrativeInput): Promise<string> {
  const systemPrompt = readFileSync(
    join(process.cwd(), "src/v2/prompts", PROMPT_FILE),
    "utf-8"
  );

  const userContent = JSON.stringify({
    departmentId: input.departmentId,
    forwardRisks: input.forwardRisks.map((r) => ({
      category: r.category,
      likelihood: r.likelihood,
      impact: r.impact,
      timeToManifest: r.timeToManifest,
      description: r.description,
    })),
    escalations: input.escalations.map((e) => ({
      riskCategory: e.riskCategory,
      currentSeverity: e.currentSeverity,
      projectedSeverity: e.projectedSeverity,
      horizon: e.horizon,
      triggerConditions: e.triggerConditions,
    })),
    opportunities: input.opportunities.map((o) => ({
      type: o.type,
      description: o.description,
      expectedBenefit: o.expectedBenefit,
      confidence: o.confidence,
    })),
    recommendations: input.recommendations,
  });

  const client = new Groq({ apiKey: env.GROQ_API_KEY });
  const response = await client.chat.completions.create({
    model: MODEL,
    max_tokens: 1024,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userContent },
    ],
  });

  return response.content
    .filter((b) => b.type === "text")
    .map((b) => (b as { type: "text"; text: string }).text)
    .join("\n")
    .trim();
}
