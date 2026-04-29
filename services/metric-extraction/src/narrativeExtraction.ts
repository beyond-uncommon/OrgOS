import Groq from "groq-sdk";
import { readFileSync } from "fs";
import { join } from "path";
import { env } from "@orgos/utils/env";
import { metricsOutputSchema, type MetricsOutput } from "./schema.js";

const MODEL = "llama-3.3-70b-versatile";
const PROMPT_VERSION = "extraction-v1";

function loadPrompt(): string {
  return readFileSync(
    join(process.cwd(), "docs/prompts/extraction-v1.md"),
    "utf-8"
  );
}

export async function narrativeExtraction(
  text: string
): Promise<{ metrics: Partial<MetricsOutput>; confidence: number; promptVersion: string }> {
  const client = new Groq({ apiKey: env.GROQ_API_KEY });
  const systemPrompt = loadPrompt();

  const response = await client.chat.completions.create({
    model: MODEL,
    max_tokens: 1024,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: `Extract metrics from this daily operational input:\n\n${text}` },
    ],
  });

  const text_content = response.choices[0]?.message?.content ?? "";
  const jsonMatch = text_content.match(/```json\n([\s\S]*?)\n```/);
  if (!jsonMatch?.[1]) {
    return { metrics: {}, confidence: 0, promptVersion: PROMPT_VERSION };
  }

  const parsed = metricsOutputSchema.safeParse(JSON.parse(jsonMatch[1]));
  if (!parsed.success) {
    return { metrics: {}, confidence: 0, promptVersion: PROMPT_VERSION };
  }

  return { metrics: parsed.data, confidence: 0.85, promptVersion: PROMPT_VERSION };
}
