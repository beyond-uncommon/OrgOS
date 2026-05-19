import { prisma, SnapshotScope, PeriodType } from "@orgos/db";
import { toDateOnly } from "@orgos/utils";
import type { ActionResult } from "@orgos/utils";

interface DepartmentNode {
  id: string;
  name: string;
  parentDepartmentId: string | null;
  children: DepartmentNode[];
}

function determineScope(node: DepartmentNode, isRoot: boolean): SnapshotScope {
  if (isRoot) return SnapshotScope.ORGANIZATION;
  if (node.children.length === 0) return SnapshotScope.DEPARTMENT;
  return SnapshotScope.PROGRAM;
}

async function buildDepartmentTree(): Promise<DepartmentNode[]> {
  const all = await prisma.department.findMany({
    select: { id: true, name: true, parentDepartmentId: true },
  });

  const nodeMap = new Map<string, DepartmentNode>();
  for (const dept of all) {
    nodeMap.set(dept.id, { ...dept, children: [] });
  }

  const roots: DepartmentNode[] = [];
  for (const node of nodeMap.values()) {
    if (node.parentDepartmentId) {
      const parent = nodeMap.get(node.parentDepartmentId);
      if (parent) parent.children.push(node);
    } else {
      roots.push(node);
    }
  }

  return roots;
}

function flattenMetricValues(
  snapshotData: Record<string, unknown[]> | null | undefined,
  target: Record<string, unknown[]>,
): void {
  if (!snapshotData) return;
  for (const [key, values] of Object.entries(snapshotData)) {
    if (!target[key]) target[key] = [];
    target[key].push(...values);
  }
}

async function collectLeafSnapshots(
  node: DepartmentNode,
  periodStart: Date,
): Promise<Record<string, unknown[]>> {
  let isLeaf = true;
  const aggregated: Record<string, unknown[]> = {};

  for (const child of node.children) {
    const childData = await collectLeafSnapshots(child, periodStart);
    if (Object.keys(childData).length > 0) {
      isLeaf = false;
    }
    flattenMetricValues(childData, aggregated);
  }

  const snapshot = await prisma.dashboardSnapshot.findFirst({
    where: {
      departmentId: node.id,
      periodType: PeriodType.DAILY,
      periodStart,
    },
    select: { data: true },
  });

  if (snapshot) {
    flattenMetricValues(snapshot.data as Record<string, unknown[]>, aggregated);
  } else {
    return aggregated;
  }

  return aggregated;
}

async function rollupNode(
  node: DepartmentNode,
  periodStart: Date,
  isRoot: boolean,
): Promise<void> {
  const aggregated: Record<string, unknown[]> = {};

  for (const child of node.children) {
    await rollupNode(child, periodStart, false);
    const childSnapshot = await prisma.dashboardSnapshot.findFirst({
      where: {
        departmentId: child.id,
        scope: determineScope(child, false),
        periodType: PeriodType.DAILY,
        periodStart,
      },
      select: { data: true },
    });
    if (childSnapshot) {
      flattenMetricValues(childSnapshot.data as Record<string, unknown[]>, aggregated);
    }

    const childDaily = await prisma.dashboardSnapshot.findFirst({
      where: {
        departmentId: child.id,
        scope: SnapshotScope.DEPARTMENT,
        periodType: PeriodType.DAILY,
        periodStart,
      },
      select: { data: true },
    });
    if (childDaily) {
      flattenMetricValues(childDaily.data as Record<string, unknown[]>, aggregated);
    }
  }

  const ownSnapshot = await prisma.dashboardSnapshot.findFirst({
    where: {
      departmentId: node.id,
      periodType: PeriodType.DAILY,
      periodStart,
    },
    select: { data: true },
  });
  if (ownSnapshot) {
    flattenMetricValues(ownSnapshot.data as Record<string, unknown[]>, aggregated);
  }

  if (Object.keys(aggregated).length === 0 && node.children.length > 0) return;

  if (Object.keys(aggregated).length > 0) {
    const scope = determineScope(node, isRoot);
    const existing = await prisma.dashboardSnapshot.findFirst({
      where: {
        departmentId: node.id,
        scope,
        periodType: PeriodType.DAILY,
        periodStart,
      },
      select: { id: true },
    });

    if (existing) {
      await prisma.dashboardSnapshot.update({
        where: { id: existing.id },
        data: { data: aggregated as object },
      });
    } else {
      await prisma.dashboardSnapshot.create({
        data: {
          departmentId: node.id,
          scope,
          periodType: PeriodType.DAILY,
          periodStart,
          data: aggregated as object,
        },
      });
    }
  }
}

export async function rollupHierarchicalSnapshots(
  date: Date,
): Promise<ActionResult<{ rootsProcessed: number }>> {
  const periodStart = toDateOnly(date);
  const roots = await buildDepartmentTree();

  for (const root of roots) {
    await rollupNode(root, periodStart, true);
  }

  return { success: true, data: { rootsProcessed: roots.length } };
}

export async function refreshWeeklySnapshot(
  departmentId: string,
  weekStart: Date,
): Promise<ActionResult<void>> {
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 6);
  weekEnd.setHours(23, 59, 59, 999);

  const snapshots = await prisma.dashboardSnapshot.findMany({
    where: {
      departmentId,
      scope: SnapshotScope.DEPARTMENT,
      periodType: PeriodType.DAILY,
      periodStart: { gte: weekStart, lte: weekEnd },
    },
    select: { data: true },
  });

  if (snapshots.length === 0) {
    return { success: true, data: undefined };
  }

  const aggregated: Record<string, unknown[]> = {};
  for (const snap of snapshots) {
    flattenMetricValues(snap.data as Record<string, unknown[]>, aggregated);
  }

  const existing = await prisma.dashboardSnapshot.findFirst({
    where: { departmentId, scope: SnapshotScope.DEPARTMENT, periodType: PeriodType.WEEKLY, periodStart: weekStart },
    select: { id: true },
  });

  if (existing) {
    await prisma.dashboardSnapshot.update({
      where: { id: existing.id },
      data: { data: aggregated as object },
    });
  } else {
    await prisma.dashboardSnapshot.create({
      data: {
        departmentId,
        scope: SnapshotScope.DEPARTMENT,
        periodType: PeriodType.WEEKLY,
        periodStart: weekStart,
        data: aggregated as object,
      },
    });
  }

  return { success: true, data: undefined };
}
