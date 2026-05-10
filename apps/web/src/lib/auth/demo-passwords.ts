const DEV_PASSWORDS: Record<string, string> = {
  "alex.rivera@uncommon.org": "instructor",
  "yc.student1@uncommon.org": "yc.student1",
  "yc.student2@uncommon.org": "yc.student2",
  "yc.student3@uncommon.org": "yc.student3",
  "hublead@uncommon.org": "hublead",
  "bootcamp@uncommon.org": "bootcamp",
  "ycmanager@uncommon.org": "ycmanager",
  "program@uncommon.org": "program",
  "pm.yc@uncommon.org": "pm.yc",
  "pm.outreach@uncommon.org": "pm.outreach",
  "pm.tt@uncommon.org": "pm.tt",
  "director@uncommon.org": "director",
  "admin@uncommon.org": "admin",
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
