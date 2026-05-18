import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const COOKIE_NAME = "orgos_demo_user";
const LOGIN_ROUTE = "/login";

const ALL_STAFF = new Set([
  "INSTRUCTOR", "HUB_LEAD", "BOOTCAMP_MANAGER", "PROGRAM_MANAGER",
  "COUNTRY_DIRECTOR", "HEAD_OF_DESIGN", "HEAD_OF_DEVELOPMENT",
  "YOUTH_CODING_MANAGER", "TEACHER_TRAINING_COORDINATOR",
  "CAREER_DEVELOPMENT_OFFICER", "REGIONAL_HUB_LEAD", "SAFEGUARDING",
  "M_AND_E", "MARKETING_COMMS_MANAGER", "BUSINESS_DEVELOPMENT_MANAGER",
  "BUSINESS_DEVELOPMENT_ASSOCIATE", "HR_OFFICER", "FINANCE_ADMIN_OFFICER",
  "HEAD_OF_OPERATIONS", "ADMIN",
]);

const ORG_WIDE = new Set([
  "COUNTRY_DIRECTOR", "ADMIN", "HEAD_OF_OPERATIONS", "M_AND_E",
  "SAFEGUARDING", "MARKETING_COMMS_MANAGER", "BUSINESS_DEVELOPMENT_MANAGER",
  "BUSINESS_DEVELOPMENT_ASSOCIATE", "HR_OFFICER", "FINANCE_ADMIN_OFFICER",
  "HEAD_OF_DESIGN", "HEAD_OF_DEVELOPMENT",
  "CAREER_DEVELOPMENT_OFFICER", "REGIONAL_HUB_LEAD",
]);

const DEPARTMENT_ACCESS = new Set([
  "HUB_LEAD", "ADMIN", "REGIONAL_HUB_LEAD", ...ORG_WIDE,
]);

type RouteGuard = {
  pattern: RegExp;
  roles: Set<string>;
};

const ROUTE_GUARDS: RouteGuard[] = [
  { pattern: /^\/$/, roles: ALL_STAFF },
  { pattern: /^\/submit$/, roles: ALL_STAFF },
  { pattern: /^\/submit-session$/, roles: new Set(["INSTRUCTOR", "HUB_LEAD", "YOUTH_CODING_MANAGER", ...ORG_WIDE]) },
  { pattern: /^\/departments\/[^/]+\/instructors\/[^/]+$/, roles: new Set(["INSTRUCTOR", ...DEPARTMENT_ACCESS]) },
  { pattern: /^\/departments\/[^/]+$/, roles: DEPARTMENT_ACCESS },
  { pattern: /^\/bootcamps\/[^/]+$/, roles: new Set(["BOOTCAMP_MANAGER", ...ORG_WIDE]) },
  { pattern: /^\/programs\/[^/]+$/, roles: new Set(["PROGRAM_MANAGER", "TEACHER_TRAINING_COORDINATOR", ...ORG_WIDE]) },
  { pattern: /^\/programs$/, roles: new Set(["PROGRAM_MANAGER", ...ORG_WIDE]) },
  { pattern: /^\/country$/, roles: new Set(["COUNTRY_DIRECTOR", "ADMIN"]) },
  { pattern: /^\/youth-coding$/, roles: new Set(["YOUTH_CODING_MANAGER", ...ORG_WIDE]) },
  { pattern: /^\/yc\/attendance\/[^/]+$/, roles: new Set(["INSTRUCTOR", "HUB_LEAD", "YOUTH_CODING_MANAGER", ...ORG_WIDE]) },
  { pattern: /^\/yc\/checkin$/, roles: new Set(["STUDENT"]) },
  { pattern: /^\/yc\/feedback$/, roles: new Set(["STUDENT"]) },
  { pattern: /^\/student\/students$/, roles: new Set(["INSTRUCTOR", ...ORG_WIDE]) },
  { pattern: /^\/student$/, roles: new Set(["STUDENT", ...ORG_WIDE]) },
  { pattern: /^\/approvals$/, roles: new Set(["HUB_LEAD", "BOOTCAMP_MANAGER", "PROGRAM_MANAGER", "YOUTH_CODING_MANAGER", ...ORG_WIDE]) },
  { pattern: /^\/approvals\/[^/]+$/, roles: new Set(["HUB_LEAD", "BOOTCAMP_MANAGER", "PROGRAM_MANAGER", "YOUTH_CODING_MANAGER", ...ORG_WIDE]) },
  { pattern: /^\/insights$/, roles: new Set(["HUB_LEAD", "BOOTCAMP_MANAGER", "PROGRAM_MANAGER", "COUNTRY_DIRECTOR", "YOUTH_CODING_MANAGER", ...ORG_WIDE]) },
  { pattern: /^\/metrics$/, roles: new Set(["HUB_LEAD", "BOOTCAMP_MANAGER", "PROGRAM_MANAGER", "COUNTRY_DIRECTOR", "YOUTH_CODING_MANAGER", ...ORG_WIDE]) },
  { pattern: /^\/interventions$/, roles: new Set(["HUB_LEAD", "BOOTCAMP_MANAGER", "PROGRAM_MANAGER", "YOUTH_CODING_MANAGER", ...ORG_WIDE]) },
  { pattern: /^\/reports$/, roles: new Set(["HUB_LEAD", "BOOTCAMP_MANAGER", "PROGRAM_MANAGER", "COUNTRY_DIRECTOR", "YOUTH_CODING_MANAGER", ...ORG_WIDE]) },
  { pattern: /^\/coming-soon$/, roles: ALL_STAFF },
  { pattern: /^\/roles\/[^/]+$/, roles: ALL_STAFF },
];

function getRoleFromCookie(request: NextRequest): string | null {
  const raw = request.cookies.get(COOKIE_NAME)?.value;
  if (!raw) return null;
  const idx = raw.indexOf(":");
  return idx === -1 ? null : raw.slice(0, idx);
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/_next") || pathname.startsWith("/favicon") || pathname === LOGIN_ROUTE || pathname.startsWith("/impact")) {
    return NextResponse.next();
  }

  const role = getRoleFromCookie(request);
  if (!role) {
    return NextResponse.redirect(new URL(LOGIN_ROUTE, request.url));
  }

  for (const guard of ROUTE_GUARDS) {
    if (guard.pattern.test(pathname)) {
      if (!guard.roles.has(role)) {
        return NextResponse.redirect(new URL("/404", request.url));
      }
      return NextResponse.next();
    }
  }

  // Fallback: allow (will be caught by page-level auth if needed)
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
