import { z } from "zod";

export const metricsOutputSchema = z.object({
  attendance_rate: z.number().min(0).max(100).optional(),
  dropout_count: z.number().int().min(0).optional(),
  engagement_score: z.enum(["LOW", "MEDIUM", "HIGH"]).optional(),
  output_count: z.number().int().min(0).optional(),
  blocker_present: z.boolean().optional(),
  risk_flag: z.boolean().optional(),
});

export type MetricsOutput = z.infer<typeof metricsOutputSchema>;
