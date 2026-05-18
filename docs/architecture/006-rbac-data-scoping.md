# ADR 006: RBAC Data Scoping

**Status:** Accepted

## Context

Different roles in the organization need access to different scopes of data. An
instructor should only see their own entries and department summaries, while a
program manager needs cross-department aggregates. Showing data outside a user's
scope creates confusion, privacy concerns, and potential security issues.

## Decision

Data scoping follows a strict hierarchy enforced at three layers:

### Scope Hierarchy
| Role | Data Scope |
|------|-----------|
| INSTRUCTOR | Own daily entries; own dept summaries (read) |
| HUB_LEAD | Full department entries + weekly/monthly reports |
| BOOTCAMP_MANAGER | Bootcamp program data within scope |
| PROGRAM_MANAGER | Cross-department program data + rollups |
| COUNTRY_DIRECTOR | Full country-level org data + all rollups |
| HEAD_OF_OPERATIONS | Full org data + all rollups |
| ADMIN | Everything + system configuration |

### Enforcement Layers
1. **Middleware (Route level):** Requested route → check user role → redirect or allow.
   Non-matching routes return 404 (not 403) to avoid leaking route existence.
2. **Server Actions (Operation level):** Every action checks whether the caller's role
   scopes to the target entity. `getAccessibleDepartmentIds()` computes the set of
   department IDs a role can access based on position in the department hierarchy.
3. **Query Layer (Data level):** All database queries include a scope filter derived
   from the caller's role. Data outside scope is never fetched — not fetched and filtered.

### Principle
Data outside a user's scope is not shown, not hidden behind a lock icon, not grayed
out, not shown with a permission error. It simply does not appear.

### Role Enumeration
Roles are stored as a Prisma enum on the User model. The 19 roles cover instructors,
hub leads, program managers, coordinators, officers, directors, and admin. Role
changes are admin-only operations.

## Consequences
- Hard boundary at the data layer — no data leakage possible through API misuse
- No "permission denied" UI needed (data never reaches the client)
- Adding a new role requires updating the schema enum, middleware, and query scoping
- Department tree traversal is required for scope computation
- Role-based navigation filtering ensures users only see routes they can access
