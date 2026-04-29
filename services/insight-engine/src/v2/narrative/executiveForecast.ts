import Groq from "groq-sdk";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { env } from "@orgos/utils";
import type { InsightForecast } from "@orgos/shared-types";

const MODEL = "llama-3.3-70b-versatile";
const PROMPT_FILE = "executive-forecast-v1.md";
export const PROMPT_VERSION = PROMPT_FILE.replace(".md", "");

interface ExecutiveForecastInput {
  forecasts: InsightForecast[];
}

/**
 * Org-level executive forecast summary.
 * Receives pre-computed per-department forecasts and produces a single briefing.
 * Claude selects the most significant signals — it does not compute them.
 */
export async function generateExecutiveForecast(input: ExecutiveForecastInput): Promise<string> {
  const systemPrompt = readFileSync(
    join(process.cwd(), "src/v2/prompts", PROMPT_FILE),
    "utf-8"
  );

  const userContent = JSON.stringify({
    departments: input.forecasts.map((f) => ({
      departmentId: f.departmentId,
      topForwardRisk: f.forwardRisks[0] ?? null,
      topOpportunity: f.opportunities[0] ?? null,
      topRecommendation: f.recommendedPreemptiveActions[0] ?? null,
      confidence: f.confidence,
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

  return response.content
    .filter((b) => b.type === "text")
    .map((b) => (b as { type: "text"; text: string }).text)
    .join("\n")
    .trim();
}
