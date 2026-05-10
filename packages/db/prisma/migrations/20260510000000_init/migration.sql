npm warn exec The following package was not found and will be installed: pnpm@10.33.4
npm warn Unknown env config "verify-deps-before-run". This will stop working in the next major version of npm.
-- CreateEnum
CREATE TYPE "Role" AS ENUM ('INSTRUCTOR', 'HUB_LEAD', 'BOOTCAMP_MANAGER', 'PROGRAM_MANAGER', 'COUNTRY_DIRECTOR', 'HEAD_OF_DESIGN', 'HEAD_OF_DEVELOPMENT', 'YOUTH_CODING_MANAGER', 'TEACHER_TRAINING_COORDINATOR', 'CAREER_DEVELOPMENT_OFFICER', 'REGIONAL_HUB_LEAD', 'SAFEGUARDING', 'M_AND_E', 'MARKETING_COMMS_MANAGER', 'BUSINESS_DEVELOPMENT_MANAGER', 'BUSINESS_DEVELOPMENT_ASSOCIATE', 'HR_OFFICER', 'FINANCE_ADMIN_OFFICER', 'HEAD_OF_OPERATIONS', 'ADMIN', 'STUDENT');

-- CreateEnum
CREATE TYPE "EntryStatus" AS ENUM ('SUBMITTED', 'PROCESSING', 'COMPLETE', 'FLAGGED');

-- CreateEnum
CREATE TYPE "MetricSource" AS ENUM ('STRUCTURED', 'NARRATIVE', 'INFERRED');

-- CreateEnum
CREATE TYPE "ReportStatus" AS ENUM ('DRAFT', 'UNDER_REVIEW', 'APPROVED', 'PUBLISHED');

-- CreateEnum
CREATE TYPE "AlertType" AS ENUM ('MISSING_ENTRY', 'ANOMALY', 'INCONSISTENCY', 'RISK');

-- CreateEnum
CREATE TYPE "Severity" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "InterventionStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'RESOLVED');

-- CreateEnum
CREATE TYPE "SnapshotScope" AS ENUM ('INDIVIDUAL', 'DEPARTMENT', 'PROGRAM', 'ORGANIZATION');

-- CreateEnum
CREATE TYPE "PeriodType" AS ENUM ('DAILY', 'WEEKLY', 'MONTHLY', 'QUARTERLY', 'ANNUAL');

-- CreateEnum
CREATE TYPE "EditRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'DENIED');

-- CreateEnum
CREATE TYPE "PendingActionStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'EXPIRED', 'EXECUTED');

-- CreateEnum
CREATE TYPE "ActionExecutionMode" AS ENUM ('AUTO', 'HUMAN_APPROVAL', 'SYSTEM');

-- CreateEnum
CREATE TYPE "AutomationLevel" AS ENUM ('FULL', 'LIMITED', 'LOCKED');

-- CreateEnum
CREATE TYPE "ProjectStatus" AS ENUM ('COMPLETE', 'NOT_COMPLETE');

-- CreateTable
CREATE TABLE "Student" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "departmentId" TEXT NOT NULL,
    "instructorId" TEXT NOT NULL,
    "enrollmentStatus" TEXT NOT NULL DEFAULT 'ACTIVE',
    "age" INTEGER,
    "gender" TEXT,
    "school" TEXT,
    "grade" TEXT,
    "community" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Student_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Department" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "parentDepartmentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Department_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "departmentId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DailyEntry" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "departmentId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "attendanceStatus" TEXT NOT NULL,
    "outputCompleted" TEXT NOT NULL,
    "blockers" TEXT NOT NULL,
    "engagementNotes" TEXT NOT NULL,
    "quickSummary" TEXT NOT NULL,
    "status" "EntryStatus" NOT NULL DEFAULT 'SUBMITTED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "averageAge" DOUBLE PRECISION,
    "dropouts" INTEGER,
    "engagementScore" TEXT,
    "femaleStudents" INTEGER,
    "maleStudents" INTEGER,
    "mentorshipPairs" INTEGER,
    "otherGender" INTEGER,
    "studentsPresent" INTEGER,
    "totalStudents" INTEGER,
    "reportType" TEXT NOT NULL DEFAULT 'DAILY',
    "studentsInvolvedIds" JSONB,
    "dropoutStudentIds" JSONB,
    "dropoutReasons" JSONB,
    "guestNotes" TEXT,
    "guestsVisited" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "DailyEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EntryEditRequest" (
    "id" TEXT NOT NULL,
    "entryId" TEXT NOT NULL,
    "requestedById" TEXT NOT NULL,
    "note" TEXT NOT NULL DEFAULT '',
    "status" "EditRequestStatus" NOT NULL DEFAULT 'PENDING',
    "reviewedById" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "reviewNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EntryEditRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EntryComment" (
    "id" TEXT NOT NULL,
    "entryId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EntryComment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExtractedMetric" (
    "id" TEXT NOT NULL,
    "entryId" TEXT NOT NULL,
    "metricKey" TEXT NOT NULL,
    "metricValue" JSONB NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL,
    "source" "MetricSource" NOT NULL,
    "flagged" BOOLEAN NOT NULL DEFAULT false,
    "promptVersion" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExtractedMetric_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WeeklyReport" (
    "id" TEXT NOT NULL,
    "weekStart" DATE NOT NULL,
    "weekEnd" DATE NOT NULL,
    "departmentId" TEXT NOT NULL,
    "status" "ReportStatus" NOT NULL DEFAULT 'DRAFT',
    "generatedContent" JSONB NOT NULL,
    "generatedMetrics" JSONB NOT NULL,
    "risks" JSONB NOT NULL,
    "originalContent" JSONB NOT NULL,
    "editLog" JSONB NOT NULL DEFAULT '[]',
    "promptVersion" TEXT NOT NULL,
    "reviewedById" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WeeklyReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MonthlyReport" (
    "id" TEXT NOT NULL,
    "periodMonth" INTEGER NOT NULL,
    "periodYear" INTEGER NOT NULL,
    "departmentId" TEXT NOT NULL,
    "status" "ReportStatus" NOT NULL DEFAULT 'DRAFT',
    "generatedContent" JSONB NOT NULL,
    "generatedMetrics" JSONB NOT NULL,
    "originalContent" JSONB NOT NULL,
    "editLog" JSONB NOT NULL DEFAULT '[]',
    "promptVersion" TEXT NOT NULL,
    "reviewedById" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MonthlyReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Alert" (
    "id" TEXT NOT NULL,
    "type" "AlertType" NOT NULL,
    "severity" "Severity" NOT NULL,
    "resolved" BOOLEAN NOT NULL DEFAULT false,
    "resolvedById" TEXT,
    "entryId" TEXT,
    "weeklyReportId" TEXT,
    "monthlyReportId" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Alert_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Intervention" (
    "id" TEXT NOT NULL,
    "alertId" TEXT NOT NULL,
    "issueType" TEXT NOT NULL,
    "severity" "Severity" NOT NULL,
    "assignedToId" TEXT NOT NULL,
    "status" "InterventionStatus" NOT NULL DEFAULT 'OPEN',
    "notes" TEXT NOT NULL DEFAULT '',
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Intervention_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PendingAction" (
    "id" TEXT NOT NULL,
    "departmentId" TEXT NOT NULL,
    "actionType" TEXT NOT NULL,
    "target" TEXT NOT NULL,
    "priority" INTEGER NOT NULL,
    "urgency" TEXT NOT NULL,
    "executionMode" "ActionExecutionMode" NOT NULL,
    "rationale" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "status" "PendingActionStatus" NOT NULL DEFAULT 'PENDING',
    "approvedById" TEXT,
    "rejectedById" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "executedAt" TIMESTAMP(3),
    "forecastRunId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PendingAction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OutcomeRecord" (
    "id" TEXT NOT NULL,
    "departmentId" TEXT NOT NULL,
    "forecastRunId" TEXT NOT NULL,
    "metricKey" TEXT NOT NULL,
    "predictedValue" DOUBLE PRECISION NOT NULL,
    "actualValue" DOUBLE PRECISION NOT NULL,
    "forecastHorizon" TEXT NOT NULL,
    "measuredAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OutcomeRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BoardPolicy" (
    "id" TEXT NOT NULL,
    "departmentId" TEXT,
    "automationLevel" "AutomationLevel" NOT NULL DEFAULT 'LIMITED',
    "maxAutoRiskThreshold" DOUBLE PRECISION NOT NULL DEFAULT 0.6,
    "allowedAutoActions" JSONB NOT NULL DEFAULT '[]',
    "forbiddenActions" JSONB NOT NULL DEFAULT '[]',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "effectiveFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "setByUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BoardPolicy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "YouthCodingSession" (
    "id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "lessonNumber" INTEGER NOT NULL,
    "projectName" TEXT NOT NULL,
    "school" TEXT NOT NULL,
    "community" TEXT NOT NULL,
    "departmentId" TEXT NOT NULL,
    "submittedById" TEXT NOT NULL,
    "instructorIds" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "YouthCodingSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SessionAttendance" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "projectStatus" "ProjectStatus" NOT NULL DEFAULT 'NOT_COMPLETE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SessionAttendance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GovernanceAuditRecord" (
    "id" TEXT NOT NULL,
    "actionPlanId" TEXT NOT NULL,
    "actionType" TEXT NOT NULL,
    "departmentId" TEXT NOT NULL,
    "decision" TEXT NOT NULL,
    "requiredLevel" TEXT,
    "reason" TEXT NOT NULL,
    "boardPolicyId" TEXT,
    "automationLevel" TEXT NOT NULL,
    "forecastRunId" TEXT NOT NULL,
    "sourceLikelihood" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GovernanceAuditRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DashboardSnapshot" (
    "id" TEXT NOT NULL,
    "departmentId" TEXT,
    "scope" "SnapshotScope" NOT NULL,
    "periodType" "PeriodType" NOT NULL,
    "periodStart" DATE NOT NULL,
    "data" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DashboardSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Student_instructorId_idx" ON "Student"("instructorId");

-- CreateIndex
CREATE INDEX "Student_departmentId_idx" ON "Student"("departmentId");

-- CreateIndex
CREATE INDEX "Department_parentDepartmentId_idx" ON "Department"("parentDepartmentId");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_departmentId_idx" ON "User"("departmentId");

-- CreateIndex
CREATE INDEX "User_role_idx" ON "User"("role");

-- CreateIndex
CREATE INDEX "DailyEntry_departmentId_date_idx" ON "DailyEntry"("departmentId", "date");

-- CreateIndex
CREATE INDEX "DailyEntry_status_idx" ON "DailyEntry"("status");

-- CreateIndex
CREATE INDEX "DailyEntry_date_idx" ON "DailyEntry"("date");

-- CreateIndex
CREATE UNIQUE INDEX "DailyEntry_userId_date_key" ON "DailyEntry"("userId", "date");

-- CreateIndex
CREATE INDEX "EntryEditRequest_entryId_idx" ON "EntryEditRequest"("entryId");

-- CreateIndex
CREATE INDEX "EntryEditRequest_status_idx" ON "EntryEditRequest"("status");

-- CreateIndex
CREATE INDEX "EntryEditRequest_requestedById_idx" ON "EntryEditRequest"("requestedById");

-- CreateIndex
CREATE INDEX "EntryComment_entryId_idx" ON "EntryComment"("entryId");

-- CreateIndex
CREATE INDEX "EntryComment_authorId_idx" ON "EntryComment"("authorId");

-- CreateIndex
CREATE INDEX "ExtractedMetric_entryId_idx" ON "ExtractedMetric"("entryId");

-- CreateIndex
CREATE INDEX "ExtractedMetric_metricKey_idx" ON "ExtractedMetric"("metricKey");

-- CreateIndex
CREATE INDEX "ExtractedMetric_flagged_idx" ON "ExtractedMetric"("flagged");

-- CreateIndex
CREATE INDEX "WeeklyReport_status_idx" ON "WeeklyReport"("status");

-- CreateIndex
CREATE INDEX "WeeklyReport_departmentId_idx" ON "WeeklyReport"("departmentId");

-- CreateIndex
CREATE UNIQUE INDEX "WeeklyReport_departmentId_weekStart_key" ON "WeeklyReport"("departmentId", "weekStart");

-- CreateIndex
CREATE INDEX "MonthlyReport_status_idx" ON "MonthlyReport"("status");

-- CreateIndex
CREATE INDEX "MonthlyReport_departmentId_idx" ON "MonthlyReport"("departmentId");

-- CreateIndex
CREATE UNIQUE INDEX "MonthlyReport_departmentId_periodYear_periodMonth_key" ON "MonthlyReport"("departmentId", "periodYear", "periodMonth");

-- CreateIndex
CREATE INDEX "Alert_severity_resolved_idx" ON "Alert"("severity", "resolved");

-- CreateIndex
CREATE INDEX "Alert_type_idx" ON "Alert"("type");

-- CreateIndex
CREATE INDEX "Alert_entryId_idx" ON "Alert"("entryId");

-- CreateIndex
CREATE INDEX "Intervention_status_idx" ON "Intervention"("status");

-- CreateIndex
CREATE INDEX "Intervention_assignedToId_idx" ON "Intervention"("assignedToId");

-- CreateIndex
CREATE INDEX "Intervention_alertId_idx" ON "Intervention"("alertId");

-- CreateIndex
CREATE INDEX "PendingAction_status_expiresAt_idx" ON "PendingAction"("status", "expiresAt");

-- CreateIndex
CREATE INDEX "PendingAction_departmentId_status_idx" ON "PendingAction"("departmentId", "status");

-- CreateIndex
CREATE INDEX "PendingAction_priority_status_idx" ON "PendingAction"("priority", "status");

-- CreateIndex
CREATE INDEX "OutcomeRecord_departmentId_forecastHorizon_idx" ON "OutcomeRecord"("departmentId", "forecastHorizon");

-- CreateIndex
CREATE INDEX "OutcomeRecord_forecastRunId_idx" ON "OutcomeRecord"("forecastRunId");

-- CreateIndex
CREATE INDEX "BoardPolicy_active_departmentId_idx" ON "BoardPolicy"("active", "departmentId");

-- CreateIndex
CREATE INDEX "YouthCodingSession_departmentId_date_idx" ON "YouthCodingSession"("departmentId", "date");

-- CreateIndex
CREATE INDEX "YouthCodingSession_submittedById_idx" ON "YouthCodingSession"("submittedById");

-- CreateIndex
CREATE INDEX "SessionAttendance_sessionId_idx" ON "SessionAttendance"("sessionId");

-- CreateIndex
CREATE INDEX "SessionAttendance_studentId_idx" ON "SessionAttendance"("studentId");

-- CreateIndex
CREATE UNIQUE INDEX "SessionAttendance_sessionId_studentId_key" ON "SessionAttendance"("sessionId", "studentId");

-- CreateIndex
CREATE INDEX "GovernanceAuditRecord_departmentId_createdAt_idx" ON "GovernanceAuditRecord"("departmentId", "createdAt");

-- CreateIndex
CREATE INDEX "GovernanceAuditRecord_actionPlanId_idx" ON "GovernanceAuditRecord"("actionPlanId");

-- CreateIndex
CREATE INDEX "GovernanceAuditRecord_forecastRunId_idx" ON "GovernanceAuditRecord"("forecastRunId");

-- CreateIndex
CREATE INDEX "DashboardSnapshot_scope_periodType_periodStart_idx" ON "DashboardSnapshot"("scope", "periodType", "periodStart");

-- CreateIndex
CREATE INDEX "DashboardSnapshot_departmentId_idx" ON "DashboardSnapshot"("departmentId");

-- AddForeignKey
ALTER TABLE "Student" ADD CONSTRAINT "Student_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Student" ADD CONSTRAINT "Student_instructorId_fkey" FOREIGN KEY ("instructorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Department" ADD CONSTRAINT "Department_parentDepartmentId_fkey" FOREIGN KEY ("parentDepartmentId") REFERENCES "Department"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DailyEntry" ADD CONSTRAINT "DailyEntry_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DailyEntry" ADD CONSTRAINT "DailyEntry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EntryEditRequest" ADD CONSTRAINT "EntryEditRequest_entryId_fkey" FOREIGN KEY ("entryId") REFERENCES "DailyEntry"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EntryEditRequest" ADD CONSTRAINT "EntryEditRequest_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EntryEditRequest" ADD CONSTRAINT "EntryEditRequest_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EntryComment" ADD CONSTRAINT "EntryComment_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EntryComment" ADD CONSTRAINT "EntryComment_entryId_fkey" FOREIGN KEY ("entryId") REFERENCES "DailyEntry"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExtractedMetric" ADD CONSTRAINT "ExtractedMetric_entryId_fkey" FOREIGN KEY ("entryId") REFERENCES "DailyEntry"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WeeklyReport" ADD CONSTRAINT "WeeklyReport_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WeeklyReport" ADD CONSTRAINT "WeeklyReport_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MonthlyReport" ADD CONSTRAINT "MonthlyReport_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MonthlyReport" ADD CONSTRAINT "MonthlyReport_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Alert" ADD CONSTRAINT "Alert_entryId_fkey" FOREIGN KEY ("entryId") REFERENCES "DailyEntry"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Alert" ADD CONSTRAINT "Alert_monthlyReportId_fkey" FOREIGN KEY ("monthlyReportId") REFERENCES "MonthlyReport"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Alert" ADD CONSTRAINT "Alert_resolvedById_fkey" FOREIGN KEY ("resolvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Alert" ADD CONSTRAINT "Alert_weeklyReportId_fkey" FOREIGN KEY ("weeklyReportId") REFERENCES "WeeklyReport"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Intervention" ADD CONSTRAINT "Intervention_alertId_fkey" FOREIGN KEY ("alertId") REFERENCES "Alert"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Intervention" ADD CONSTRAINT "Intervention_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PendingAction" ADD CONSTRAINT "PendingAction_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PendingAction" ADD CONSTRAINT "PendingAction_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PendingAction" ADD CONSTRAINT "PendingAction_rejectedById_fkey" FOREIGN KEY ("rejectedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OutcomeRecord" ADD CONSTRAINT "OutcomeRecord_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BoardPolicy" ADD CONSTRAINT "BoardPolicy_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BoardPolicy" ADD CONSTRAINT "BoardPolicy_setByUserId_fkey" FOREIGN KEY ("setByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "YouthCodingSession" ADD CONSTRAINT "YouthCodingSession_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "YouthCodingSession" ADD CONSTRAINT "YouthCodingSession_submittedById_fkey" FOREIGN KEY ("submittedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SessionAttendance" ADD CONSTRAINT "SessionAttendance_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "YouthCodingSession"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SessionAttendance" ADD CONSTRAINT "SessionAttendance_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DashboardSnapshot" ADD CONSTRAINT "DashboardSnapshot_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE SET NULL ON UPDATE CASCADE;

┌─────────────────────────────────────────────────────────┐
│  Update available 5.22.0 -> 7.8.0                       │
│                                                         │
│  This is a major update - please follow the guide at    │
│  https://pris.ly/d/major-version-upgrade                │
│                                                         │
│  Run the following to update                            │
│    npm i --save-dev prisma@latest                       │
│    npm i @prisma/client@latest                          │
└─────────────────────────────────────────────────────────┘
