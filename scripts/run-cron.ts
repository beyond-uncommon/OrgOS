/**
 * Cron runner — triggers pipeline jobs locally via the dev server API.
 *
 * Usage:
 *   CRON_SECRET="..." npx tsx scripts/run-cron.ts daily
 *   CRON_SECRET="..." npx tsx scripts/run-cron.ts weekly
 *   CRON_SECRET="..." npx tsx scripts/run-cron.ts monthly
 *   CRON_SECRET="..." npx tsx scripts/run-cron.ts all
 *
 * Requires the Next.js dev server running on http://localhost:3000
 */

const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const SECRET = process.env.CRON_SECRET;
const JOB = process.argv[2];

if (!SECRET) {
  console.error("❌ CRON_SECRET env var is required");
  process.exit(1);
}

if (!JOB || !["daily", "weekly", "monthly", "all"].includes(JOB)) {
  console.error("Usage: CRON_SECRET=... npx tsx scripts/run-cron.ts [daily|weekly|monthly|all]");
  process.exit(1);
}

const JOBS = JOB === "all" ? ["daily", "weekly", "monthly"] as const : [JOB] as const;

async function main() {
  for (const job of JOBS) {
    const url = `${BASE}/api/cron/${job}`;
    console.log(`\n🚀 Triggering ${job}...`);

    try {
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${SECRET}`,
          "Content-Type": "application/json",
        },
      });

      const body = await res.json();
      if (res.ok && body.ok) {
        console.log(`✅ ${job} succeeded`);
        if (body.results) body.results.forEach((r: string) => console.log(`   • ${r}`));
      } else {
        console.error(`❌ ${job} failed (${res.status})`);
        if (body.errors) body.errors.forEach((e: string) => console.error(`   • ${e}`));
        if (body.results) body.results.forEach((r: string) => console.log(`   • ${r}`));
        if (!res.ok && !body.errors) console.error(`   ${JSON.stringify(body)}`);
      }
    } catch (err) {
      console.error(`❌ ${job} — network error:`, err instanceof Error ? err.message : String(err));
      console.error(`   Make sure the dev server is running on ${BASE}`);
    }
  }
}

main();
