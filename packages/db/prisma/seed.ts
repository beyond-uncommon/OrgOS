import { prisma, Role, EntryStatus, AlertType, Severity, SnapshotScope, PeriodType, PendingActionStatus, ActionExecutionMode, ProjectStatus } from "@orgos/db";

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

const YC_SCHOOLS = ["Westside Primary", "Northgate Academy", "Sunridge School", "Hillcrest High", "Valley View"];
const YC_COMMUNITIES = ["Westlands", "Northgate", "Sunridge", "Hillcrest", "Valley View"];
const YC_GRADES = ["5", "6", "7", "8", "9", "10", "11", "12"];
const YC_GENDERS: ("M" | "F" | "O")[] = ["M", "F", "M", "F", "O", "M", "F", "M"];
const YC_PROJECTS = ["Scratch Game", "HTML Portfolio", "Python Quiz", "Micro:bit Sensor", "App Prototype", "Web Design", "Data Viz", "Game Dev"];

const YC_INSTRUCTORS = [
  { email: "instructor.yc1@uncommon.org", name: "Kwame Asante" },
  { email: "instructor.yc2@uncommon.org", name: "Zuri Okonkwo" },
];

const STUDENT_REPORT_TEMPLATES = [
  { learned: "How to use loops in Python", enjoyed: "The coding challenges", struggled: "Understanding nested loops", rating: 4 },
  { learned: "Basic HTML tags and structure", enjoyed: "Seeing my webpage come together", struggled: "CSS styling", rating: 5 },
  { learned: "Variables and data types", enjoyed: "The interactive quiz game", struggled: "Type conversion", rating: 3 },
  { learned: "Creating animations in Scratch", enjoyed: "Designing my own characters", struggled: "Timing the animation frames", rating: 4 },
  { learned: "How sensors work with Micro:bit", enjoyed: "The physical computing projects", struggled: "Wiring the circuits", rating: 5 },
  { learned: "Responsive web design principles", enjoyed: "Making mobile-friendly pages", struggled: "Media queries", rating: 4 },
  { learned: "Data visualization with charts", enjoyed: "Seeing patterns in the data", struggled: "Choosing the right chart type", rating: 3 },
  { learned: "Game design fundamentals", enjoyed: "Testing my friends games", struggled: "Balancing difficulty levels", rating: 5 },
  { learned: "Functions and parameters", enjoyed: "Writing reusable code", struggled: "Return values", rating: 4 },
  { learned: "CSS Flexbox and Grid", enjoyed: "The layout challenges", struggled: "Grid template areas", rating: 3 },
];

async function seedYouthCodingHub(
  hub: { id: string },
  today: Date,
) {
  // ── Create INSTRUCTOR users for this YC hub ────────────
  const ycInstructors = await Promise.all(
    YC_INSTRUCTORS.map((d) =>
      prisma.user.create({ data: { email: d.email, name: d.name, role: Role.INSTRUCTOR, departmentId: hub.id } })
    )
  );

  // ── Create STUDENT user (YC Coordinator) ───────────────
  const ycCoordinator = await prisma.user.create({
    data: { email: "yc.student1@uncommon.org", name: "Jamie Osei", role: Role.STUDENT, departmentId: hub.id },
  });

  const instructors = [ycInstructors[0]!, ycInstructors[1]!, ycCoordinator];

  // ── Register 20 youth coding students ──────────────────
  const ycStudents = await Promise.all(
    Array.from({ length: 20 }, (_, i) => {
      const nameSeed = 500 + i;
      return prisma.student.create({
        data: {
          name: studentName(nameSeed),
          departmentId: hub.id,
          instructorId: ycInstructors[0]!.id,
          enrollmentStatus: "ACTIVE",
          age: 10 + (nameSeed % 9),
          gender: YC_GENDERS[i % YC_GENDERS.length],
          school: YC_SCHOOLS[nameSeed % YC_SCHOOLS.length],
          grade: YC_GRADES[nameSeed % YC_GRADES.length],
          community: YC_COMMUNITIES[nameSeed % YC_COMMUNITIES.length],
        },
      });
    })
  );

  const studentIds = ycStudents.map(s => s.id);

  // ── Create 10 weekly YC sessions ───────────────────────
  const projectStatuses: ProjectStatus[] = [
    ProjectStatus.COMPLETE,
    ProjectStatus.COMPLETE,
    ProjectStatus.NOT_COMPLETE,
    ProjectStatus.COMPLETE,
    ProjectStatus.NOT_COMPLETE,
    ProjectStatus.COMPLETE,
    ProjectStatus.NOT_COMPLETE,
    ProjectStatus.COMPLETE,
    ProjectStatus.COMPLETE,
    ProjectStatus.COMPLETE,
    ProjectStatus.NOT_COMPLETE,
    ProjectStatus.COMPLETE,
    ProjectStatus.NOT_COMPLETE,
    ProjectStatus.COMPLETE,
    ProjectStatus.COMPLETE,
    ProjectStatus.NOT_COMPLETE,
    ProjectStatus.COMPLETE,
    ProjectStatus.COMPLETE,
    ProjectStatus.COMPLETE,
    ProjectStatus.NOT_COMPLETE,
  ];

  const sessionIds: string[] = [];

  for (let s = 0; s < 10; s++) {
    const sessionDate = new Date(today);
    sessionDate.setDate(today.getDate() - (s + 1) * 7);
    sessionDate.setHours(0, 0, 0, 0);

    // Vary attendance: first sessions have more students present
    const absentCount = Math.min(s, 7);
    const presentIds = studentIds.slice(absentCount);

    const session = await prisma.youthCodingSession.create({
      data: {
        date: sessionDate,
        lessonNumber: s + 1,
        projectName: YC_PROJECTS[s % YC_PROJECTS.length]!,
        school: YC_SCHOOLS[s % YC_SCHOOLS.length]!,
        community: YC_COMMUNITIES[s % YC_COMMUNITIES.length]!,
        departmentId: hub.id,
        submittedById: ycCoordinator.id,
        instructorIds: [ycInstructors[0]!.id, ycInstructors[1]!.id],
        attendance: {
          create: presentIds.map((sid, i) => ({
            studentId: sid,
            projectStatus: projectStatuses[i % projectStatuses.length]!,
          })),
        },
      },
    });
    sessionIds.push(session.id);
  }

  // ── Create student reports for last 3 sessions ─────────
  for (let s = 7; s < 10; s++) {
    const reportDate = new Date(today);
    reportDate.setDate(today.getDate() - (s + 1) * 7 + 1);
    reportDate.setHours(0, 0, 0, 0);

    for (const studentId of studentIds) {
      const template = STUDENT_REPORT_TEMPLATES[(s + studentId.length) % STUDENT_REPORT_TEMPLATES.length]!;
      await prisma.studentReport.create({
        data: {
          studentId,
          date: reportDate,
          learned: template.learned,
          enjoyed: template.enjoyed,
          struggled: template.struggled,
          rating: template.rating + (s % 2 === 0 ? 0 : -1),
        },
      });
    }
  }

  // ── Daily entries for YC instructors (14 days) ─────────
  for (const instructor of ycInstructors) {
    for (let daysAgo = 1; daysAgo <= 14; daysAgo++) {
      const date = new Date(today);
      date.setDate(today.getDate() - daysAgo);
      date.setHours(0, 0, 0, 0);

      const existing = await prisma.dailyEntry.findUnique({
        where: { userId_date: { userId: instructor.id, date } },
      });
      if (existing) continue;

      const seed = instructor.id.charCodeAt(0) + daysAgo;
      const studentsPresent = 16 + (seed % 7);
      const dropouts = daysAgo % 7 === 0 ? 1 : 0;

      await prisma.dailyEntry.create({
        data: {
          userId: instructor.id,
          departmentId: hub.id,
          date,
          status: EntryStatus.COMPLETE,
          reportType: "DAILY",
          attendanceStatus: studentsPresent >= 20 ? "All students present" : `${20 - studentsPresent} absent`,
          outputCompleted: `Lesson ${seed % 10 + 1} completed. ${studentsPresent} students attended.`,
          blockers: daysAgo % 5 === 0 ? "Internet connectivity issues in afternoon session." : "",
          engagementNotes: "",
          quickSummary: daysAgo < 7 ? "Productive session. Students progressing well." : "Good engagement with new project work.",
          totalStudents: 20,
          studentsPresent,
          dropouts,
          engagementScore: daysAgo < 4 ? "HIGH" : daysAgo < 10 ? "MEDIUM" : "LOW",
          guestsVisited: false,
        },
      });
    }
  }

  // ── 1 Monthly report for the YC hub ───────────────────
  await prisma.monthlyReport.create({
    data: {
      periodMonth: today.getMonth() + 1,
      periodYear: today.getFullYear(),
      departmentId: hub.id,
      status: "APPROVED",
      promptVersion: "monthly-summary-v1",
      generatedContent: {
        summary: "Monthly report for YC program. Consistent attendance with good engagement trends.",
        highlights: ["10 sessions conducted", "Average attendance 18/20 students", "3 projects completed per student"],
        challenges: ["Internet connectivity issues in 2 sessions", "3 students need catch-up sessions"],
      },
      generatedMetrics: {
        totalSessions: 10,
        avgAttendance: 18,
        completionRate: 78,
        genderBreakdown: { male: 10, female: 8, other: 2 },
      },
      risks: [],
      originalContent: {},
      editLog: [],
    },
  });

  // ── 2 Weekly reports for the YC hub ────────────────────
  for (let w = 0; w < 2; w++) {
    const weekEnd = new Date(today);
    weekEnd.setDate(today.getDate() - w * 7);
    weekEnd.setHours(0, 0, 0, 0);
    const weekStart = new Date(weekEnd);
    weekStart.setDate(weekStart.getDate() - 6);

    await prisma.weeklyReport.create({
      data: {
        weekStart,
        weekEnd,
        departmentId: hub.id,
        status: "APPROVED",
        promptVersion: "weekly-summary-v1",
        generatedContent: {
          summary: `Week ${w + 1} of YC program at ${hub.name}. Average attendance ${16 + (w * 2)} students per session.`,
          highlights: ["Students completed web design projects", "High engagement in coding exercises"],
          challenges: ["Some students need extra support with JavaScript concepts"],
        },
        generatedMetrics: {
          totalSessions: 5,
          avgAttendance: 16 + (w * 2),
          completionRate: 65 + (w * 5),
          genderBreakdown: { male: 10, female: 8, other: 2 },
        },
        risks: [],
        originalContent: {},
        editLog: [],
      },
    });
  }
}

async function main() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // ── Clear existing data in dependency order (safe for pooled connections) ─
  await prisma.entryEditRequest.deleteMany();
  await prisma.entryComment.deleteMany();
  await prisma.intervention.deleteMany();
  await prisma.alert.deleteMany();
  await prisma.extractedMetric.deleteMany();
  await prisma.dailyEntry.deleteMany();
  await prisma.studentReport.deleteMany();
  await prisma.sessionAttendance.deleteMany();
  await prisma.youthCodingSession.deleteMany();
  await prisma.student.deleteMany();
  await prisma.pendingAction.deleteMany();
  await prisma.dashboardSnapshot.deleteMany();
  await prisma.boardPolicy.deleteMany();
  await prisma.outcomeRecord.deleteMany();
  await prisma.governanceAuditRecord.deleteMany();
  await prisma.weeklyReport.deleteMany();
  await prisma.monthlyReport.deleteMany();
  await prisma.fundingRecord.deleteMany();
  await prisma.attendanceRecord.deleteMany();
  await prisma.attendanceSession.deleteMany();
  await prisma.user.deleteMany();
  // Delete departments leaf-first to respect self-referential FK
  await prisma.department.deleteMany({ where: { parentDepartmentId: { not: null } } });
  await prisma.department.deleteMany();

  // ── Department tree ───────────────────────────────────────────────────────
  const org = await prisma.department.create({
    data: { id: "org-root", name: "Uncommon" },
  });

  // Four programs under the org
  const progYC = await prisma.department.create({
    data: { id: "prog-yc", name: "Youth Coding Program", parentDepartmentId: org.id },
  });
  const progOutreach = await prisma.department.create({
    data: { id: "prog-outreach", name: "Outreach Program", parentDepartmentId: org.id },
  });
  const progBootcamp = await prisma.department.create({
    data: { id: "prog-bootcamp", name: "Bootcamp Program", parentDepartmentId: org.id },
  });
  const progTeacherTraining = await prisma.department.create({
    data: { id: "prog-teacher-training", name: "Teacher Training Program", parentDepartmentId: org.id },
  });

  const bootcamp = await prisma.department.create({
    data: { id: "boot-design", name: "Design Bootcamp", parentDepartmentId: progBootcamp.id },
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

  // ── YC Hubs (under Youth Coding Program) ─────────────────────────────────
  const ycHub1 = await prisma.department.create({
    data: { id: "yc-hub-dzivarasekwa", name: "Dzivarasekwa Hub", parentDepartmentId: progYC.id },
  });
  const ycHub2 = await prisma.department.create({
    data: { id: "yc-hub-2", name: "Budiriro Hub", parentDepartmentId: progYC.id },
  });
  const ycHub3 = await prisma.department.create({
    data: { id: "yc-hub-3", name: "Highfields Hub", parentDepartmentId: progYC.id },
  });

  // ── Leadership users ──────────────────────────────────────────────────────
  await prisma.user.create({
    data: { email: "director@uncommon.org", name: "Morgan Ellis", role: Role.COUNTRY_DIRECTOR, departmentId: org.id },
  });

  // Program Manager — oversees all programs
  await prisma.user.create({
    data: { email: "program@uncommon.org", name: "Sam Torres", role: Role.PROGRAM_MANAGER, departmentId: org.id },
  });

  // Youth Coding Manager
  await prisma.user.create({
    data: { email: "ycmanager@uncommon.org", name: "Dana Osei", role: Role.YOUTH_CODING_MANAGER, departmentId: progYC.id },
  });

  // Bootcamp Manager — manages a specific bootcamp
  await prisma.user.create({
    data: { email: "bootcamp@uncommon.org", name: "Casey Morgan", role: Role.BOOTCAMP_MANAGER, departmentId: bootcamp.id },
  });

  // Teacher Training Coordinator
  await prisma.user.create({
    data: { email: "pm.tt@uncommon.org", name: "Nadia Osei", role: Role.TEACHER_TRAINING_COORDINATOR, departmentId: progTeacherTraining.id },
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

  // ── Remaining roles (one demo user each for coverage) ─────────────────────
  await prisma.user.create({ data: { email: "head.design@uncommon.org", name: "Aria Chen", role: Role.HEAD_OF_DESIGN, departmentId: org.id } });
  await prisma.user.create({ data: { email: "head.dev@uncommon.org", name: "Elena Voss", role: Role.HEAD_OF_DEVELOPMENT, departmentId: org.id } });
  await prisma.user.create({ data: { email: "head.ops@uncommon.org", name: "Omar Hassan", role: Role.HEAD_OF_OPERATIONS, departmentId: org.id } });
  await prisma.user.create({ data: { email: "career.dev@uncommon.org", name: "Lila Mbeki", role: Role.CAREER_DEVELOPMENT_OFFICER, departmentId: org.id } });
  await prisma.user.create({ data: { email: "regional.hub@uncommon.org", name: "Carlos Mendez", role: Role.REGIONAL_HUB_LEAD, departmentId: org.id } });
  await prisma.user.create({ data: { email: "safeguarding@uncommon.org", name: "Ngozi Adebayo", role: Role.SAFEGUARDING, departmentId: org.id } });
  await prisma.user.create({ data: { email: "mande@uncommon.org", name: "Suki Tanaka", role: Role.M_AND_E, departmentId: org.id } });
  await prisma.user.create({ data: { email: "marketing@uncommon.org", name: "Liam O'Brien", role: Role.MARKETING_COMMS_MANAGER, departmentId: org.id } });
  await prisma.user.create({ data: { email: "bizdev.mgr@uncommon.org", name: "Fatima Al-Rashid", role: Role.BUSINESS_DEVELOPMENT_MANAGER, departmentId: org.id } });
  await prisma.user.create({ data: { email: "bizdev.assoc@uncommon.org", name: "James Kariuki", role: Role.BUSINESS_DEVELOPMENT_ASSOCIATE, departmentId: org.id } });
  await prisma.user.create({ data: { email: "hr@uncommon.org", name: "Priya Sharma", role: Role.HR_OFFICER, departmentId: org.id } });
  await prisma.user.create({ data: { email: "finance@uncommon.org", name: "Kwame Asare", role: Role.FINANCE_ADMIN_OFFICER, departmentId: org.id } });

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

  // ── Youth Coding seed data (Dzivarasekwa Hub only) ────────────────────────
  await seedYouthCodingHub(ycHub1, today);

  console.log("✓ Seed complete.");
  console.log(`  Org tree: ${org.name} → [${progYC.name} | ${progOutreach.name} | ${progBootcamp.name} | ${progTeacherTraining.name}]`);
  // ── Demo funding records ──────────────────────────────────────────────────
  const fundingData: { amount: number; source: string; description: string; receivedAt: Date; programId?: string }[] = [
    { amount: 250000, source: "Global Impact Grant", description: "Annual youth coding program grant", receivedAt: new Date(today.getFullYear(), 0, 15) },
    { amount: 150000, source: "Corporate Sponsorship — TechCorp", description: "Bootcamp equipment and materials", receivedAt: new Date(today.getFullYear(), 2, 1), programId: progBootcamp.id },
    { amount: 75000, source: "Individual Donor — Anonymous", description: "General operations support", receivedAt: new Date(today.getFullYear(), 3, 10) },
    { amount: 50000, source: "Foundation Grant — Bright Future", description: "Teacher training program launch", receivedAt: new Date(today.getFullYear(), 4, 5), programId: progTeacherTraining.id },
    { amount: 100000, source: "Government Partnership — Min of Education", description: "After-school coding initiative", receivedAt: new Date(today.getFullYear(), 5, 1), programId: progYC.id },
    { amount: 30000, source: "Community Fundraiser", description: "Hub renovation and supplies", receivedAt: new Date(today.getFullYear(), 6, 20), programId: progYC.id },
    { amount: 200000, source: "Corporate Sponsorship — DesignLabs", description: "Design bootcamp scholarship fund", receivedAt: new Date(today.getFullYear(), 8, 1), programId: progBootcamp.id },
    { amount: 80000, source: "International Development Grant", description: "Outreach program expansion", receivedAt: new Date(today.getFullYear(), 9, 15), programId: progOutreach.id },
    { amount: 45000, source: "Alumni Donation Pool", description: "Student supplies and transport", receivedAt: new Date(today.getFullYear(), 10, 1) },
    { amount: 120000, source: "Matching Gift Campaign", description: "Year-end fundraising drive match", receivedAt: new Date(today.getFullYear(), 11, 20) },
  ];

  for (const f of fundingData) {
    await prisma.fundingRecord.create({ data: f });
  }

  console.log(`  Bootcamp path: ${progBootcamp.name} → ${bootcamp.name} → ${hub1.name} / ${hub2.name} / ${hub3.name}`);
  console.log(`  YC Hub: ${ycHub1.name} (20 students, 10 sessions, 60 reports, 2 instructors)`);
  console.log(`  Instructors: ${allInstructors.length + 2} total (5 per bootcamp hub + 2 YC hub)`);
  console.log(`  YC Instructor: instructor.yc1@uncommon.org`);
  console.log(`  Demo instructor (bootcamp): ${demoInstructor.email}`);
  console.log(`  Hub Lead (Hub 1): hublead@uncommon.org / hublead`);
  console.log(`  Bootcamp Manager: bootcamp@uncommon.org / bootcamp`);
  console.log(`  Program Manager: program@uncommon.org / program`);
  console.log(`  Country Director: director@uncommon.org / director`);
  console.log(`  YC Coordinator: yc.student1@uncommon.org / yc.student1`);
  console.log(`  YC Manager: ycmanager@uncommon.org`);
  console.log(`  ${12} additional roles seeded (head.design through finance)`);
  console.log(`  Monthly Report seeded for YC hub`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
