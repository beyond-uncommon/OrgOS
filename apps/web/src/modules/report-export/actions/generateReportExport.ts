import 'server-only';
import { prisma } from '@orgos/db';
import { requireSession } from '@/lib/auth/requireSession';
import { getAccessibleDepartmentIds } from '@orgos/utils';
import { z } from 'zod';

const ExportSchema = z.object({
  departmentId: z.string(),
  period: z.enum(['daily', 'weekly', 'monthly']),
  format: z.enum(['csv', 'pdf']),
});

export async function generateReportExport(
  params: z.infer<typeof ExportSchema>
) {
  const user = await requireSession();

  const validated = ExportSchema.parse(params);

  const accessibleIds = await getAccessibleDepartmentIds(user.role, user.departmentId, prisma);
  if (!accessibleIds.includes(validated.departmentId)) {
    throw new Error('Access denied to this department');
  }

  const department = await prisma.department.findUnique({
    where: { id: validated.departmentId },
    select: { id: true, name: true },
  });

  if (!department) {
    throw new Error('Department not found');
  }

  let data: Record<string, unknown>[] = [];
  let columns: Array<{ key: string; label: string }> = [];

  switch (validated.period) {
    case 'daily': {
      const snapshots = await prisma.dashboardSnapshot.findMany({
        where: { departmentId: validated.departmentId },
        orderBy: { periodStart: 'desc' },
        take: 30,
      });

      data = snapshots.map((s) => {
        const d = s.data as Record<string, unknown[]> | null;
        return {
          date: s.periodStart.toISOString().split('T')[0],
          submissions: Array.isArray(d?.submissions) ? (d!.submissions as number[])[0] ?? 0 : 0,
          avgEngagement: Array.isArray(d?.engagement_score) ? (d!.engagement_score as number[])[0] ?? 0 : 0,
          dropouts: Array.isArray(d?.dropout_count) ? (d!.dropout_count as number[])[0] ?? 0 : 0,
        };
      });

      columns = [
        { key: 'date', label: 'Date' },
        { key: 'submissions', label: 'Submissions' },
        { key: 'avgEngagement', label: 'Avg Engagement' },
        { key: 'dropouts', label: 'Dropouts' },
      ];
      break;
    }

    case 'weekly': {
      const reports = await prisma.weeklyReport.findMany({
        where: { departmentId: validated.departmentId },
        orderBy: { weekStart: 'desc' },
        take: 12,
      });

      data = reports.map((r) => {
        const m = r.generatedMetrics as Record<string, unknown> | null;
        return {
          weekStart: r.weekStart.toISOString().split('T')[0],
          weekEnd: r.weekEnd.toISOString().split('T')[0],
          submissions: (m?.totalSubmissions as number) ?? 0,
          avgDaily: (m?.avgDailySubmissions as number) ?? 0,
          dropouts: (m?.totalDropouts as number) ?? 0,
          engagementTrend: (m?.engagementTrend as string) ?? '',
          riskLevel: (m?.riskLevel as string) ?? '',
        };
      });

      columns = [
        { key: 'weekStart', label: 'Week Start' },
        { key: 'weekEnd', label: 'Week End' },
        { key: 'submissions', label: 'Total Submissions' },
        { key: 'avgDaily', label: 'Avg Daily' },
        { key: 'dropouts', label: 'Dropouts' },
        { key: 'engagementTrend', label: 'Engagement Trend' },
        { key: 'riskLevel', label: 'Risk Level' },
      ];
      break;
    }

    case 'monthly': {
      const reports = await prisma.monthlyReport.findMany({
        where: { departmentId: validated.departmentId },
        orderBy: { periodYear: 'desc', periodMonth: 'desc' },
        take: 12,
      });

      data = reports.map((r) => {
        const m = r.generatedMetrics as Record<string, unknown> | null;
        return {
          month: `${r.periodYear}-${String(r.periodMonth).padStart(2, '0')}`,
          submissions: (m?.totalSubmissions as number) ?? 0,
          dropouts: (m?.totalDropouts as number) ?? 0,
          avgEngagement: (m?.avgEngagement as number) ?? 0,
          topRisks: ((m?.topRisks as string[]) ?? []).join('; '),
          status: r.status,
        };
      });

      columns = [
        { key: 'month', label: 'Month' },
        { key: 'submissions', label: 'Total Submissions' },
        { key: 'dropouts', label: 'Dropouts' },
        { key: 'avgEngagement', label: 'Avg Engagement' },
        { key: 'topRisks', label: 'Top Risks' },
        { key: 'status', label: 'Status' },
      ];
      break;
    }
  }

  return {
    department,
    period: validated.period,
    format: validated.format,
    data,
    columns,
    generatedAt: new Date().toISOString(),
  };
}