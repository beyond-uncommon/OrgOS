import Groq from "groq-sdk";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { env } from "@orgos/utils";
import type { InsightPattern, InsightCorrelation, RiskSignal } from "@orgos/shared-types";

const MODEL = "llama-3.3-70b-versatile";
const PROMPT_FILE = "weekly-insights-v1.md";
export const PROMPT_VERSION = PROMPT_FILE.replace(".md", "");

interface WeeklyNarrativeInput {
  departmentId: string;
  patterns: InsightPattern[];
  correlations: InsightCorrelation[];
  risks: RiskSignal[];
  recommendations: string[];
}

export async function generateWeeklyNarrative(input: WeeklyNarrativeInput): Promise<string> {
  const systemPrompt = readFileSync(
    join(process.cwd(), "src/prompts", PROMPT_FILE),
    "utf-8"
  );

  const userContent = JSON.stringify({
    departmentId: input.departmentId,
    patterns: input.patterns.map((p) => ({ type: p.type, severity: p.severity, description: p.description })),
    correlations: input.correlations.map((c) => ({ cause: c.cause, effect: c.effect, confidence: c.confidence })),
    risks: input.risks.map((r) => ({ category: r.category, severity: r.severity, description: r.description })),
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

  return (response.choices[0]?.message?.content ?? "")
    
    .trim();
}
