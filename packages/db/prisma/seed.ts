import {
  PrismaClient,
  Role,
  EntryStatus,
  AlertType,
  Severity,
  SnapshotScope,
  PeriodType,
  PendingActionStatus,
  ActionExecutionMode,
} from "@prisma/client";

const prisma = new PrismaClient();

// ── Instructor roster: 5 per hub ─────────────────────────────────────────────
const HUB1_INSTRUCTORS = [
  { email: "alex.rivera@uncommon.org",   name: "Alex Rivera"   },
  { email: "morgan.chen@uncommon.org",   name: "Morgan Chen"   },
  { email: "taylor.brooks@uncommon.org", name: "Taylor Brooks" },
  { email: "jordan.hayes@uncommon.org",  name: "Jordan Hayes"  },
  { email: "casey.nguyen@uncommon.org",  name: "Casey Nguyen"  },
];

const HUB2_INSTRUCTORS = [
  { email: "riley.patel@uncommon.org",   name: "Riley Patel"   },
  { email: "avery.santos@uncommon.org",  name: "Avery Santos"  },
  { email: "quinn.walker@uncommon.org",  name: "Quinn Walker"  },
  { email: "drew.okafor@uncommon.org",   name: "Drew Okafor"   },
  { email: "sage.williams@uncommon.org", name: "Sage Williams" },
];

const HUB3_INSTRUCTORS = [
  { email: "blake.torres@uncommon.org",  name: "Blake Torres"  },
  { email: "reese.kim@uncommon.org",     name: "Reese Kim"     },
  { email: "finley.lopez@uncommon.org",  name: "Finley Lopez"  },
  { email: "parker.james@uncommon.org",  name: "Parker James"  },
  { email: "skyler.wu@uncommon.org",     name: "Skyler Wu"     },
];

const FIRST_NAMES = [
  "Aisha","Marcus","Priya","Jordan","Lena","Darius","Sofia","Elias","Naomi","Theo",
  "Zara","Malik","Camille","Rafi","Yara","Dante","Imani","Ezra","Nadia","Caleb",
  "Layla","Kwame","Sienna","Jaden","Fatima","Noah","Amara","Tomas","Kezia","Adrian",
  "Mia","Leon","Chloe","Finn","Sasha","Omar","Vivian","Kael","Petra","Beau",
  "Ingrid","Cyrus","Alicia","Jasper","Nora","Solomon","Iris","Emeka","Clara","Remy",
];
const LAST_NAMES = [
  "Okafor","Rivera","Patel","Chen","Williams","Davis","Torres","Johnson","Singh","Kim",
  "Walker","Thomas","Martinez","Brown","Jackson","White","Harris","Martin","Garcia","Lee",
  "Thompson","Lewis","Robinson","Clark","Hall","Young","Allen","King","Wright","Scott",
  "Green","Baker","Adams","Nelson","Carter","Mitchell","Perez","Roberts","Turner","Phillips",
];

function studentName(seed: number): string {
  return `${FIRST_NAMES[seed % FIRST_NAMES.length]} ${LAST_NAMES[Math.floor(seed / FIRST_NAMES.length) % LAST_NAMES.length]}`;
}

async function seedInstructorEntries(
  instructors: { id: string; departmentId: string }[],
  departmentId: string,
  today: Date,
  options: { attendanceRange: [number, number]; engagementBias: "positive" | "negative" | "neutral" },
) {
  const ATTENDANCE_STATUS = [
    "All students present.",
    "2 students absent — excused.",
    "1 student absent — unexcused.",
    "3 students absent — family notified.",
    "4 students absent — illness reported.",
  ];
  const OUTPUTS = [
    "3 assignments reviewed, 1 lesson plan submitted.",
    "2 portfolio pieces critiqued, group project check-in completed.",
    "4 concept sketches reviewed, peer feedback session run.",
    "1 capstone milestone submitted, 2 revisions reviewed.",
    "5 assignments graded, weekly progress notes updated.",
  ];
  const SUMMARIES = [
    "Productive session with strong output quality.",
    "Good engagement in morning, slower afternoon.",
    "Strong peer critique session, high participation.",
    "Steady progress. One student flagged for additional support.",
    "Workshop format worked well. Students highly engaged.",
  ];

  const [minAtt, maxAtt] = options.attendanceRange;

  for (const instructor of instructors) {
    for (let daysAgo = 1; daysAgo <= 14; daysAgo++) {
      const date = new Date(today);
      date.setDate(today.getDate() - daysAgo);
      date.setHours(0, 0, 0, 0);

      const existing = await prisma.dailyEntry.findUnique({
        where: { userId_date: { userId: instructor.id, date } },
      });
      if (existing) continue;

      const seed = instructor.id.charCodeAt(0) + daysAgo;
      const attendanceRate = minAtt + ((seed * 7) % (maxAtt - minAtt + 1));
      const totalStudents = 22 + (seed % 3);
      const studentsPresent = Math.round(totalStudents * (attendanceRate / 100));
      const dropouts = daysAgo % 7 === 0 ? 1 : 0;

      let engagementScore: "HIGH" | "MEDIUM" | "LOW";
      if (options.engagementBias === "positive") {
        engagementScore = seed % 3 === 0 ? "MEDIUM" : "HIGH";
      } else if (options.engagementBias === "negative") {
        engagementScore = seed % 3 === 0 ? "MEDIUM" : "LOW";
      } else {
        engagementScore = seed % 3 === 0 ? "HIGH" : seed % 3 === 1 ? "MEDIUM" : "LOW";
      }

      await prisma.dailyEntry.create({
        data: {
          userId: instructor.id,
          departmentId,
          date,
          status: EntryStatus.COMPLETE,
          reportType: "DAILY",
          attendanceStatus: ATTENDANCE_STATUS[seed % ATTENDANCE_STATUS.length] ?? "",
          outputCompleted: OUTPUTS[seed % OUTPUTS.length] ?? "",
          blockers: daysAgo % 5 === 0 ? "Equipment issues with projector in studio room." : "",
          engagementNotes: "",
          quickSummary: SUMMARIES[seed % SUMMARIES.length] ?? "",
          totalStudents,
          studentsPresent,
          dropouts,
          engagementScore,
          guestsVisited: false,
        },
      });
    }
  }
}

async function main() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // ── Clear existing data using CASCADE to avoid FK ordering issues ────────
  await prisma.$executeRawUnsafe(`TRUNCATE TABLE "EntryEditRequest", "EntryComment", "Intervention", "Alert", "ExtractedMetric", "DailyEntry", "PendingAction", "DashboardSnapshot", "BoardPolicy", "OutcomeRecord", "GovernanceAuditRecord", "Student", "WeeklyReport", "MonthlyReport", "User" CASCADE`);
  // Delete departments leaf-first to respect self-referential FK
  await prisma.department.deleteMany({ where: { parentDepartmentId: { not: null } } });
  await prisma.department.deleteMany();

  // ── Department tree ───────────────────────────────────────────────────────
  const org = await prisma.department.create({
    data: { id: "org-root", name: "Uncommon" },
  });

  const program = await prisma.department.create({
    data: { id: "prog-design", name: "Design Program", parentDepartmentId: org.id },
  });

  const bootcamp = await prisma.department.create({
    data: { id: "boot-design", name: "Design Bootcamp", parentDepartmentId: program.id },
  });

  const hub1 = await prisma.department.create({
    data: { id: "dept-design", name: "Hub 1 — Design", parentDepartmentId: bootcamp.id },
  });
  const hub2 = await prisma.department.create({
    data: { id: "hub-2", name: "Hub 2 — Design", parentDepartmentId: bootcamp.id },
  });
  const hub3 = await prisma.department.create({
    data: { id: "hub-3", name: "Hub 3 — Design", parentDepartmentId: bootcamp.id },
  });

  // ── Leadership users ──────────────────────────────────────────────────────
  await prisma.user.create({
    data: { email: "director@uncommon.org", name: "Morgan Ellis", role: Role.COUNTRY_DIRECTOR, departmentId: org.id },
  });

  await prisma.user.create({
    data: { email: "program@uncommon.org", name: "Sam Torres", role: Role.PROGRAM_MANAGER, departmentId: program.id },
  });

  await prisma.user.create({
    data: { email: "bootcamp@uncommon.org", name: "Casey Morgan", role: Role.BOOTCAMP_MANAGER, departmentId: bootcamp.id },
  });

  const hubLead1 = await prisma.user.create({
    data: { email: "hublead@uncommon.org", name: "Jordan Kim", role: Role.HUB_LEAD, departmentId: hub1.id },
  });
  await prisma.user.create({
    data: { email: "hublead2@uncommon.org", name: "Priya Nair", role: Role.HUB_LEAD, departmentId: hub2.id },
  });
  await prisma.user.create({
    data: { email: "hublead3@uncommon.org", name: "Marcus Diallo", role: Role.HUB_LEAD, departmentId: hub3.id },
  });

  await prisma.user.create({
    data: { email: "admin@uncommon.org", name: "Admin User", role: Role.ADMIN, departmentId: org.id },
  });

  // ── Instructors ───────────────────────────────────────────────────────────
  const hub1Instructors = await Promise.all(
    HUB1_INSTRUCTORS.map((d) =>
      prisma.user.create({ data: { email: d.email, name: d.name, role: Role.INSTRUCTOR, departmentId: hub1.id } })
    )
  );
  const hub2Instructors = await Promise.all(
    HUB2_INSTRUCTORS.map((d) =>
      prisma.user.create({ data: { email: d.email, name: d.name, role: Role.INSTRUCTOR, departmentId: hub2.id } })
    )
  );
  const hub3Instructors = await Promise.all(
    HUB3_INSTRUCTORS.map((d) =>
      prisma.user.create({ data: { email: d.email, name: d.name, role: Role.INSTRUCTOR, departmentId: hub3.id } })
    )
  );

  const demoInstructor = hub1Instructors[0]!;

  // ── Students (22–24 per instructor) ───────────────────────────────────────
  const allInstructors = [...hub1Instructors, ...hub2Instructors, ...hub3Instructors];
  let studentSeed = 0;
  for (const instructor of allInstructors) {
    const count = 22 + (studentSeed % 3);
    for (let i = 0; i < count; i++) {
      await prisma.student.create({
        data: {
          name: studentName(studentSeed),
          departmentId: instructor.departmentId,
          instructorId: instructor.id,
          enrollmentStatus: "ACTIVE",
        },
      });
      studentSeed++;
    }
  }

  // ── Daily entries for all instructors ─────────────────────────────────────
  await seedInstructorEntries(hub1Instructors, hub1.id, today, {
    attendanceRange: [85, 95],
    engagementBias: "positive",
  });

  await seedInstructorEntries(hub2Instructors, hub2.id, today, {
    attendanceRange: [70, 85],
    engagementBias: "neutral",
  });

  await seedInstructorEntries(hub3Instructors, hub3.id, today, {
    attendanceRange: [60, 75],
    engagementBias: "negative",
  });

  // ── Special entries for demo instructor (Alex Rivera) ─────────────────────
  const incidentDate = new Date(today);
  incidentDate.setDate(today.getDate() - 16);
  incidentDate.setHours(0, 0, 0, 0);

  const hub1Students = await prisma.student.findMany({
    where: { instructorId: demoInstructor.id },
    take: 2,
    select: { id: true },
  });

  await prisma.dailyEntry.create({
    data: {
      userId: demoInstructor.id,
      departmentId: hub1.id,
      date: incidentDate,
      status: EntryStatus.COMPLETE,
      reportType: "INCIDENT",
      attendanceStatus: "Student Conflict",
      outputCompleted: "Verbal altercation between two students during afternoon critique. Separated immediately. Both students removed from session and spoken to individually.",
      blockers: "Coordinator and both families notified same day.",
      engagementNotes: "Follow-up counseling session scheduled for both students tomorrow morning.",
      quickSummary: "Verbal conflict between two students during critique. Resolved on-site, escalated to coordinator and families.",
      engagementScore: "HIGH",
      studentsPresent: 2,
      guestsVisited: false,
      ...(hub1Students.length ? { studentsInvolvedIds: hub1Students.map((s) => s.id) } : {}),
    },
  });

  const sessionDate = new Date(today);
  sessionDate.setDate(today.getDate() - 19);
  sessionDate.setHours(0, 0, 0, 0);

  await prisma.dailyEntry.create({
    data: {
      userId: demoInstructor.id,
      departmentId: hub1.id,
      date: sessionDate,
      status: EntryStatus.COMPLETE,
      reportType: "SESSION",
      attendanceStatus: "Guest Lecture",
      outputCompleted: "Guest designer from local agency led a 90-minute brand identity workshop. Students completed 3 rapid logo sketches each.",
      blockers: "",
      engagementNotes: "Highest energy session this month. Students asked to book a follow-up.",
      quickSummary: "Guest workshop on brand identity. Exceptional engagement — best session of the month.",
      engagementScore: "HIGH",
      totalStudents: 24,
      studentsPresent: 23,
      guestsVisited: true,
      guestNotes: "1 guest designer from Blink Creative Agency.",
    },
  });

  // ── DashboardSnapshots (one daily + one weekly per hub) ───────────────────
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  const weekStart = new Date(today);
  weekStart.setDate(today.getDate() - 7);

  const hubConfigs = [
    { hub: hub1, attendanceVals: [0.88, 0.91, 0.87, 0.93, 0.90], engagement: ["HIGH","HIGH","MEDIUM","HIGH","HIGH"] },
    { hub: hub2, attendanceVals: [0.75, 0.78, 0.72, 0.80, 0.76], engagement: ["MEDIUM","MEDIUM","LOW","MEDIUM","HIGH"] },
    { hub: hub3, attendanceVals: [0.62, 0.65, 0.60, 0.58, 0.63], engagement: ["LOW","LOW","MEDIUM","LOW","LOW"] },
  ];

  for (const cfg of hubConfigs) {
    await prisma.dashboardSnapshot.create({
      data: {
        departmentId: cfg.hub.id,
        scope: SnapshotScope.DEPARTMENT,
        periodType: PeriodType.DAILY,
        periodStart: yesterday,
        data: {
          attendance_rate: cfg.attendanceVals,
          engagement_score: cfg.engagement,
          output_count: [4, 5, 3, 4, 5],
          dropout_count: [0, 1, 0, 0, 1],
        },
      },
    });

    await prisma.dashboardSnapshot.create({
      data: {
        departmentId: cfg.hub.id,
        scope: SnapshotScope.DEPARTMENT,
        periodType: PeriodType.WEEKLY,
        periodStart: weekStart,
        data: {
          type: "WEEKLY",
          departmentId: cfg.hub.id,
          summary: cfg.hub.id === hub3.id
            ? "Hub 3 attendance has been declining for the past week. Engagement is predominantly LOW. Immediate intervention recommended."
            : "Hub performing within expected ranges. Engagement trending positive.",
          insights: [],
          correlations: [],
          risks: cfg.hub.id === hub3.id ? [
            { category: "OPERATIONAL", severity: "HIGH", description: "Attendance below 65% for 5 consecutive days.", evidence: [] },
          ] : [],
          recommendations: [],
          confidence: 0.78,
          generatedAt: new Date().toISOString(),
          promptVersion: "weekly-summary-v1",
        },
      },
    });
  }

  // ── Alert for Hub 3 attendance drop ──────────────────────────────────────
  const hub3Entry = await prisma.dailyEntry.findFirst({
    where: { departmentId: hub3.id },
    orderBy: { date: "desc" },
  });
  if (hub3Entry) {
    await prisma.alert.create({
      data: {
        type: AlertType.ANOMALY,
        severity: Severity.HIGH,
        resolved: false,
        entryId: hub3Entry.id,
        metadata: {
          anomalyType: "SPIKE",
          metricKey: "attendance_rate",
          description: "Attendance rate in Hub 3 dropped 28% below 14-day rolling average. Consecutive decline for 5 days.",
          detectedAt: new Date().toISOString(),
        },
      },
    });
  }

  // ── PendingAction ─────────────────────────────────────────────────────────
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);

  await prisma.pendingAction.create({
    data: {
      departmentId: hub3.id,
      actionType: "student_engagement_intervention",
      target: hub3.id,
      priority: 1,
      urgency: "24H",
      executionMode: ActionExecutionMode.HUMAN_APPROVAL,
      rationale: "Hub 3 attendance declined 28% over 5 days. Engagement risk is HIGH. Recommended: initiate attendance recovery protocol.",
      payload: { alertType: "SPIKE", metricKey: "attendance_rate", daysDeclined: 5, avgRate: 0.63, instructorCount: 5 },
      forecastRunId: "seed-forecast-001",
      expiresAt,
      status: PendingActionStatus.PENDING,
    },
  });

  // ── BoardPolicy ───────────────────────────────────────────────────────────
  await prisma.boardPolicy.create({
    data: {
      departmentId: null,
      automationLevel: "LIMITED",
      maxAutoRiskThreshold: 0.6,
      allowedAutoActions: ["baseline_documentation", "engagement_opportunity_flag"],
      forbiddenActions: [],
      active: true,
      setByUserId: hubLead1.id,
    },
  });

  console.log("✓ Seed complete.");
  console.log(`  Org tree: ${org.name} → ${program.name} → ${bootcamp.name} → ${hub1.name} / ${hub2.name} / ${hub3.name}`);
  console.log(`  Instructors: ${allInstructors.length} (5 per hub)`);
  console.log(`  Demo instructor: ${demoInstructor.email}`);
  console.log(`  Hub Lead (Hub 1): hublead@uncommon.org / hublead`);
  console.log(`  Bootcamp Manager: bootcamp@uncommon.org / bootcamp`);
  console.log(`  Program Manager: program@uncommon.org / program`);
  console.log(`  Country Director: director@uncommon.org / director`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
