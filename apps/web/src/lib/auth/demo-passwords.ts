const DEV_PASSWORDS: Record<string, string> = {
  "alex.rivera@uncommon.org": "instructor",
  "yc.student1@uncommon.org": "yc.student1",
  "yc.coordinator2@uncommon.org": "yc.coordinator2",
  "yc.coordinator3@uncommon.org": "yc.coordinator3",
  "hublead@uncommon.org": "hublead",
  "hublead2@uncommon.org": "hublead2",
  "hublead3@uncommon.org": "hublead3",
  "bootcamp@uncommon.org": "bootcamp",
  "ycmanager@uncommon.org": "ycmanager",
  "instructor.yc1@uncommon.org": "yc1",
  "instructor.yc2@uncommon.org": "yc2",
  "pm.tt@uncommon.org": "pm.tt",
  "program@uncommon.org": "program",
  "director@uncommon.org": "director",
  "admin@uncommon.org": "admin",
  "head.design@uncommon.org": "design",
  "head.dev@uncommon.org": "dev",
  "head.ops@uncommon.org": "ops",
  "career.dev@uncommon.org": "career",
  "regional.hub@uncommon.org": "regional",
  "safeguarding@uncommon.org": "safeguarding",
  "mande@uncommon.org": "mande",
  "marketing@uncommon.org": "marketing",
  "bizdev.mgr@uncommon.org": "bizdev",
  "bizdev.assoc@uncommon.org": "bizdev2",
  "hr@uncommon.org": "hr",
  "finance@uncommon.org": "finance",
  "partner@uncommon.org": "partner2024",
};

export function getDemoPasswords(): Record<string, string> {
  const fromEnv = process.env.DEMO_PASSWORDS;
  if (fromEnv) {
    try {
      return JSON.parse(fromEnv) as Record<string, string>;
    } catch {
      console.warn("DEMO_PASSWORDS env var is not valid JSON, falling back to dev defaults.");
    }
  }

  if (!fromEnv && process.env.NODE_ENV === "production") {
    console.warn("DEMO_PASSWORDS not configured in production — using dev defaults. Set DEMO_PASSWORDS env var for production.");
  }

  return DEV_PASSWORDS;
}
