import Groq from "groq-sdk";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { env } from "@orgos/utils";
import type { RiskSignal } from "@orgos/shared-types";

const MODEL = "llama-3.3-70b-versatile";
const PROMPT_FILE = "executive-snapshot-v1.md";
export const PROMPT_VERSION = PROMPT_FILE.replace(".md", "");

interface ExecutiveNarrativeInput {
  /** One entry per department — executive view merges all */
  departments: Array<{
    departmentId: string;
    risks: RiskSignal[];
    recommendations: string[];
    confidence: number;
  }>;
}

export async function generateExecutiveNarrative(input: ExecutiveNarrativeInput): Promise<string> {
  const systemPrompt = readFileSync(
    join(process.cwd(), "src/prompts", PROMPT_FILE),
    "utf-8"
  );

  const userContent = JSON.stringify({
    departments: input.departments.map((d) => ({
      departmentId: d.departmentId,
      risks: d.risks.map((r) => ({ category: r.category, severity: r.severity, description: r.description })),
      topRecommendation: d.recommendations[0] ?? null,
      confidence: d.confidence,
    })),
  });

  const client = new Groq({ apiKey: env.GROQ_API_KEY });
  const response = await client.chat.completions.create({
    model: MODEL,
    max_tokens: 512,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userContent },
    ],
  });

  return (response.choices[0]?.message?.content ?? "")
    
    .trim();
}
