import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth/session";
import { prisma } from "@orgos/db";
import { getAccessibleDepartmentIds } from "@orgos/utils";
import { RoleDashboardClient } from "../RoleDashboardClient";

const ROLE_ROUTES: Record<string, string> = {
  HEAD_OF_OPERATIONS: "/roles/head-of-operations",
  HEAD_OF_DESIGN: "/roles/head-of-design",
  HEAD_OF_DEVELOPMENT: "/roles/head-of-development",
  SAFEGUARDING: "/roles/safeguarding",
  M_AND_E: "/roles/me",
  MARKETING_COMMS_MANAGER: "/roles/marketing",
  BUSINESS_DEVELOPMENT_MANAGER: "/roles/business-dev",
  BUSINESS_DEVELOPMENT_ASSOCIATE: "/roles/business-dev-associate",
  CAREER_DEVELOPMENT_OFFICER: "/roles/career-dev",
  REGIONAL_HUB_LEAD: "/roles/regional-hub",
  HR_OFFICER: "/roles/hr",
  FINANCE_ADMIN_OFFICER: "/roles/finance",
};

function buildStats(role: string, accessibleIds: string[], totalAlerts: number) {
  const stats = [];

  if (accessibleIds.length > 0) {
    stats.push(
      { label: "Departments", value: accessibleIds.length },
    );
  }

  stats.push(
    { label: "Alerts", value: totalAlerts, sub: totalAlerts > 0 ? "Active — needs attention" : "All clear" },
  );

  switch (role) {
    case "HEAD_OF_OPERATIONS":
      stats.push({ label: "Reports Submitted", value: "—" });
      break;
    case "HEAD_OF_DESIGN":
      stats.push({ label: "Curriculum Items", value: "—" });
      stats.push({ label: "Design Students", value: "—" });
      break;
    case "HEAD_OF_DEVELOPMENT":
      stats.push({ label: "Dev Students", value: "—" });
      stats.push({ label: "Projects", value: "—" });
      break;
    case "SAFEGUARDING":
      stats.push({ label: "Open Cases", value: "—" });
      stats.push({ label: "Resolved", value: "—" });
      break;
    case "M_AND_E":
      stats.push({ label: "KPIs Tracked", value: "—" });
      stats.push({ label: "Reports", value: "—" });
      break;
    case "MARKETING_COMMS_MANAGER":
      stats.push({ label: "Reached", value: "—" });
      stats.push({ label: "Campaigns", value: "—" });
      break;
    case "BUSINESS_DEVELOPMENT_MANAGER":
      stats.push({ label: "Partners", value: "—" });
      stats.push({ label: "Open Deals", value: "—" });
      break;
    case "BUSINESS_DEVELOPMENT_ASSOCIATE":
      stats.push({ label: "Prospects", value: "—" });
      stats.push({ label: "Research Items", value: "—" });
      break;
    case "CAREER_DEVELOPMENT_OFFICER":
      stats.push({ label: "Graduates", value: "—" });
      stats.push({ label: "Placements", value: "—" });
      break;
    case "REGIONAL_HUB_LEAD":
      stats.push({ label: "Regional Hubs", value: "—" });
      stats.push({ label: "Hub Leads", value: "—" });
      break;
    case "HR_OFFICER":
      stats.push({ label: "Staff Members", value: "—" });
      stats.push({ label: "Open Roles", value: "—" });
      break;
    case "FINANCE_ADMIN_OFFICER":
      stats.push({ label: "Budget Items", value: "—" });
      stats.push({ label: "Expenses", value: "—" });
      break;
  }

  return stats;
}

function buildAlerts(allAlerts: { type: string; severity: string; createdAt: Date }[]) {
  return allAlerts.slice(0, 5).map((a) => ({
    type: a.type,
    severity: a.severity,
    message: "Review required",
    date: new Date(a.createdAt).toLocaleDateString(),
  }));
}

function buildRecentActivity(role: string) {
  const activities: { date: string; description: string; type: string }[] = [];

  switch (role) {
    case "HEAD_OF_OPERATIONS":
      activities.push({ date: new Date().toLocaleDateString(), description: "Reviewed weekly operational summary", type: "Report" });
      break;
    case "HEAD_OF_DESIGN":
      activities.push({ date: new Date().toLocaleDateString(), description: "Reviewed curriculum updates for Q2", type: "Curriculum" });
      break;
    case "HEAD_OF_DEVELOPMENT":
      activities.push({ date: new Date().toLocaleDateString(), description: "Reviewed student coding progress report", type: "Development" });
      break;
    case "SAFEGUARDING":
      activities.push({ date: new Date().toLocaleDateString(), description: "Reviewed safeguarding compliance checklist", type: "Compliance" });
      break;
    case "M_AND_E":
      activities.push({ date: new Date().toLocaleDateString(), description: "Updated KPI dashboard for all programs", type: "Monitoring" });
      break;
    case "MARKETING_COMMS_MANAGER":
      activities.push({ date: new Date().toLocaleDateString(), description: "Published monthly impact newsletter", type: "Comms" });
      break;
    case "BUSINESS_DEVELOPMENT_MANAGER":
      activities.push({ date: new Date().toLocaleDateString(), description: "Reviewed grant application status", type: "Business Dev" });
      break;
    case "BUSINESS_DEVELOPMENT_ASSOCIATE":
      activities.push({ date: new Date().toLocaleDateString(), description: "Updated partner database with new contacts", type: "Research" });
      break;
    case "CAREER_DEVELOPMENT_OFFICER":
      activities.push({ date: new Date().toLocaleDateString(), description: "Reviewed graduate placement report", type: "Career" });
      break;
    case "REGIONAL_HUB_LEAD":
      activities.push({ date: new Date().toLocaleDateString(), description: "Coordinated hub schedule for next month", type: "Operations" });
      break;
    case "HR_OFFICER":
      activities.push({ date: new Date().toLocaleDateString(), description: "Reviewed staff performance updates", type: "HR" });
      break;
    case "FINANCE_ADMIN_OFFICER":
      activities.push({ date: new Date().toLocaleDateString(), description: "Reconciled monthly expense reports", type: "Finance" });
      break;
  }

  return activities;
}

interface Props {
  params: Promise<{ role: string }>;
}

const ROLE_MAP: Record<string, string> = {
  "head-of-operations": "HEAD_OF_OPERATIONS",
  "head-of-design": "HEAD_OF_DESIGN",
  "head-of-development": "HEAD_OF_DEVELOPMENT",
  "safeguarding": "SAFEGUARDING",
  "me": "M_AND_E",
  "marketing": "MARKETING_COMMS_MANAGER",
  "business-dev": "BUSINESS_DEVELOPMENT_MANAGER",
  "business-dev-associate": "BUSINESS_DEVELOPMENT_ASSOCIATE",
  "career-dev": "CAREER_DEVELOPMENT_OFFICER",
  "regional-hub": "REGIONAL_HUB_LEAD",
  "hr": "HR_OFFICER",
  "finance": "FINANCE_ADMIN_OFFICER",
};

export default async function RoleDashboardPage({ params }: Props) {
  const { role: roleSlug } = await params;
  const sessionUser = await getSessionUser();
  if (!sessionUser) redirect("/login");

  const role = ROLE_MAP[roleSlug];
  if (!role) redirect("/coming-soon");

  if (sessionUser.role !== role && sessionUser.role !== "ADMIN" && sessionUser.role !== "COUNTRY_DIRECTOR") {
    redirect("/coming-soon");
  }

  const accessibleIds = await getAccessibleDepartmentIds(role, sessionUser.departmentId, prisma);

  const allAlerts = accessibleIds.length > 0
    ? await prisma.alert.findMany({
        where: {
          resolved: false,
          ...(accessibleIds.length > 0 ? { entry: { departmentId: { in: accessibleIds } } } : {}),
        },
        orderBy: { createdAt: "desc" },
        take: 5,
      })
    : [];

  const hasAlerts = allAlerts.length > 0;
  const stats = buildStats(role, accessibleIds, allAlerts.length);
  const alerts = buildAlerts(allAlerts);
  const recentActivity = buildRecentActivity(role);

  return (
    <RoleDashboardClient
      role={role}
      stats={stats}
      alerts={alerts}
      recentActivity={recentActivity}
      hasAlerts={hasAlerts}
    />
  );
}