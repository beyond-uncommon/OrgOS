# PROJECT_RULES.md

# Uncommon OrgOS — Project Rules

---

## Purpose

This document defines how we work on this codebase.
It covers conventions, workflow, naming, testing, and AI-assisted development rules.

---

## Branching & Git

- `main` — production-ready only. Never commit directly.
- `dev` — integration branch. PRs merge here first.
- `feature/<short-description>` — new features
- `fix/<short-description>` — bug fixes
- `chore/<short-description>` — infra, deps, config

Branch names: lowercase, hyphen-separated.

Commit messages: imperative, present tense.
```
add daily entry submission form
fix metric extraction for engagement_score field
refactor weekly report generation to use shared aggregation service
```

---

## Pull Requests

Every PR must include:
1. What changed (1–3 bullets)
2. Why it changed
3. Any schema migrations called out explicitly
4. Testing notes

Scope PRs to a single concern. Never mix feature work with refactors.

---

## File Naming

| Type | Convention | Example |
|------|-----------|---------|
| Components | PascalCase | `DailyEntryForm.tsx` |
| Hooks | camelCase, `use` prefix | `useDailyEntry.ts` |
| Server actions | camelCase | `submitDailyEntry.ts` |
| Services | camelCase | `extractionService.ts` |
| Types | PascalCase | `DailyEntry.ts` |
| Schemas | camelCase, `Schema` suffix | `dailyEntrySchema.ts` |
| DB queries | camelCase, domain prefix | `dailyEntryQueries.ts` |

---

## TypeScript Rules

- Strict mode always on.
- No `any`. Use `unknown` and narrow, or define a proper type.
- No implicit returns in async functions — always type the return.
- Prefer `type` over `interface` for data shapes.
- Zod schemas are the source of truth for runtime validation. Infer TS types from them:

```ts
const dailyEntrySchema = z.object({ ... });
type DailyEntry = z.infer<typeof dailyEntrySchema>;
```

---

## Component Rules

- Components are presentational or container — not both.
- No business logic inside components.
- Props are always typed.
- Named exports only — no default exports on components.
- Keep components under 150 lines. If longer, split.

---

## Server Actions

- All mutations go through server actions.
- Validate input with Zod before doing anything else.
- Return typed results: `{ success: true, data }` or `{ success: false, error }`.
- Never throw from a server action — return errors as values.

```ts
export async function submitDailyEntry(input: unknown) {
  const parsed = dailyEntrySchema.safeParse(input);
  if (!parsed.success) return { success: false, error: parsed.error };
  // ...
  return { success: true, data: result };
}
```

---

## Service Layer Rules

- All business logic lives in `services/` or `modules/<domain>/services/`.
- Services are plain functions — not classes.
- Services do not import UI components or hooks.
- Services accept typed inputs and return typed outputs.
- Services call Prisma via `queries.ts` — not inline.

---

## Report Generation Rules

- WeeklyReports and MonthlyReports are **always** system-generated. No manual authoring flows.
- `generatedContent` and `originalContent` are set once at generation time and **never mutated**.
- Reviewer edits are stored in `editLog` as a JSON array.
- Approval state is tracked explicitly. A report cannot trigger downstream rollups until `APPROVED`.
- The prompt version used to generate a report must be stored on the record.

---

## Metric Extraction Rules

- Every ExtractedMetric stores: `source` (STRUCTURED / NARRATIVE / INFERRED), `confidence`, and `promptVersion`.
- Extraction results are Zod-validated before persistence.
- Deterministic extraction runs before LLM extraction — do not call Claude for values that can be parsed directly.
- Confidence below a threshold triggers a `flagged: true` state and may generate an Alert.

---

## Rollup Rules

- Rollups aggregate strictly level-by-level. No skipping.
- A rollup cannot be generated until all contributing records at the level below are `APPROVED`.
- Rollup generation is triggered by approval events — not cron.
- Rollup records store pre-computed metrics. Never recompute at read time.

---

## DailyEntry Rules

- DailyEntry records are **never deleted**. Use `status` to invalidate.
- Each user submits at most one DailyEntry per calendar day. Enforce at DB and action layer.
- A DailyEntry is immutable after status reaches `COMPLETE`. Amendments create a new record with a reference to the original.

---

## Database Rules

- All schema changes go through Prisma migrations. Never edit the DB directly.
- Every migration reviewed before merging to `dev`.
- Destructive migrations (column drops, renames) require explicit PR callout.
- Seed scripts in `infrastructure/db/seed.ts`.
- Multi-table operations use transactions.

---

## AI / Prompt Rules

- Prompts are versioned files in `docs/prompts/`. Do not hardcode inline.
- Never overwrite a prompt file — create a new version.
- All LLM calls use structured output (Zod-validated before persistence).
- All LLM calls log: model used, prompt version, input tokens, output tokens.
- Every generated report and every ExtractedMetric stores the prompt version that produced it.
- Never ship a prompt change without testing on a sample of real daily entries.

---

## Intervention Rules

- Interventions are created automatically by the intervention-engine when Alert severity is HIGH or CRITICAL.
- Interventions are a first-class module — not an alert sidebar.
- An Intervention must have an assigned owner before it can move to IN_PROGRESS.
- Resolved interventions are never deleted — they form a resolution audit trail.

---

## Dashboard Rules

- Dashboards read from DashboardSnapshot records — not live metric queries.
- DashboardSnapshots are updated by the dashboard-engine on a scheduled basis and on approval events.
- No siloed data sources. One data source, multiple views.

---

## Testing Rules

- Unit tests for all service functions.
- Integration tests for extraction pipeline (real DailyEntry inputs → expected ExtractedMetrics).
- Integration tests for report generation (real metrics → expected report structure).
- Do not mock the database in integration tests.
- Component tests for: daily entry form, report review/approval flow, intervention management.
- Test files colocate with source.

---

## Error Handling

- Typed error results at service and action boundaries.
- Error boundaries in UI for dashboard and report views.
- Unhandled promise rejections are bugs.
- Log errors with context (userId, entryId, operation). Never log raw PII.

---

## Environment Variables

- All vars documented in `infrastructure/env/`.
- Required vars validated at startup with Zod.
- Access via central `packages/utils/env.ts` — never ad hoc.

---

## Phase Discipline

Do not build Phase N+1 features during Phase N work.

| Phase | Scope |
|-------|-------|
| 1 | User/role/dept schema, daily entry system, core DB |
| 2 | Metric extraction, weekly report generation, approval workflow |
| 3 | Monthly reports, dashboard MVP |
| 4 | Anomaly detection, alerts, interventions |

If an AI assistant or collaborator proposes a Phase 3 feature during Phase 1, decline and log it as a future item.

---

## Forbidden Patterns

| Pattern | Reason |
|---------|--------|
| Business logic in components | Untestable |
| `any` type | Defeats TypeScript |
| Inline AI prompts | Unauditable |
| Direct DB access outside queries.ts | Inconsistent data layer |
| Manual weekly or monthly report authoring | Reports are generated, not authored |
| Mutating `generatedContent` or `originalContent` | Edits go in `editLog`; originals are preserved |
| Submitting a rollup before child records are APPROVED | Pipeline integrity violation |
| Recomputing rollup metrics at read time | Pre-compute and store |
| Deleting DailyEntry records | Use status; entries are the audit trail |
| Siloed dashboard data sources | All dashboards share one data source |
| Flat permission checks | RBAC is hierarchical |

---

## AI-Assisted Development Rules

1. Always provide domain context (module, layer, phase).
2. Reference CLAUDE.md and ARCHITECTURE.md when prompting for new features.
3. Review all AI-generated code against these rules before committing.
4. AI-generated prompts for the intelligence layer must go in `docs/prompts/`.
5. AI should challenge architecture when appropriate — do not blindly accept generated scaffolds.
6. Enforce phase discipline: reject Phase N+1 suggestions during Phase N.

---

## Documentation Rules

- Every new module gets a `README.md` explaining its purpose and key exports.
- ADRs go in `docs/architecture/` with an incrementing number.
- Prompt changes logged in `docs/prompts/CHANGELOG.md`.
- Document the *why*, not the *what*. The code explains what; the docs explain why.

---

## Security Rules

- All server actions verify caller role before operating.
- Report and entry data scoped to caller's department/role at query level.
- Approval actions verify the caller has the appropriate role for that report's scope.
- Secrets in environment variables only — never in code or git.
