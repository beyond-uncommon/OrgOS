import Groq from "groq-sdk";

const client = new Groq({ apiKey: process.env.GROQ_API_KEY ?? "" });

export async function generateQuickSummary(fields: {
  attendanceStatus: string;
  outputCompleted: string;
  blockers: string;
  engagementNotes: string;
  reportType: string;
}): Promise<string> {
  if (!process.env.GROQ_API_KEY) {
    return fallbackSummary(fields);
  }

  const prompt = `Write a brief 1-2 sentence summary of today's ${fields.reportType.toLowerCase()} report based on these notes:

Attendance: ${fields.attendanceStatus}
Outputs: ${fields.outputCompleted}
Blockers: ${fields.blockers}
Engagement Notes: ${fields.engagementNotes}

Write a concise, factual summary in first person. Do not add information not present in the notes.`;

  try {
    const response = await client.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      max_tokens: 150,
      messages: [
        { role: "system", content: "You are a staff member writing a brief daily summary. Be concise and factual." },
        { role: "user", content: prompt },
      ],
    });

    return response.choices[0]?.message?.content?.trim() || fallbackSummary(fields);
  } catch {
    return fallbackSummary(fields);
  }
}

function fallbackSummary(fields: {
  attendanceStatus: string;
  outputCompleted: string;
  blockers: string;
  engagementNotes: string;
  reportType: string;
}): string {
  const parts: string[] = [];
  if (fields.attendanceStatus) parts.push(`Attendance: ${fields.attendanceStatus}`);
  if (fields.outputCompleted) parts.push(`Outputs: ${fields.outputCompleted}`);
  if (fields.blockers) parts.push(`Blockers: ${fields.blockers}`);
  if (fields.engagementNotes) parts.push(`Engagement: ${fields.engagementNotes}`);
  return parts.length > 0 ? parts.join(". ") : `${fields.reportType} report submitted.`;
}
