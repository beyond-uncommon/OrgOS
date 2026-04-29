# OrgOS Design System
**Version 1.0 — Single Source of Truth**

---

## 1. Design Philosophy

OrgOS is a decision intelligence system. Every UI decision must serve operational clarity, not aesthetics.

### Core Principles

**Clarity over decoration.**
Every element on screen must earn its place. Decorative UI that does not communicate data, state, or action is prohibited.

**Decision-making over aesthetics.**
The primary job of every screen is to help a user make a decision or take an action. Visual beauty is a byproduct of structural clarity, not a goal.

**Data hierarchy first.**
Information is always presented in order of urgency and scope: risks → metrics → insights → raw data. This order is non-negotiable.

**Consistency across all modules.**
A MetricCard in the daily-inputs module looks and behaves identically to a MetricCard in the dashboards module. Components are never re-implemented per feature.

**Role-aware, not role-cluttered.**
The UI surfaces only what a given role needs. Data outside a user's scope is not shown — not hidden behind a lock icon, not grayed out, not shown with a permission error. It simply does not appear.

---

## 2. UI System Foundation

### Framework

| Layer | Choice |
|-------|--------|
| Design System | Google Material Design 3 |
| Component Library | Material UI (MUI) v6+ |
| Icons | Material Symbols (Rounded variant) |
| Charts | MUI X Charts |

### Non-Negotiable Constraints

- All components are built on or extend MUI primitives.
- No Tailwind CSS. No Bootstrap. No Chakra. No custom CSS utility frameworks.
- Custom styles are applied exclusively via MUI's `sx` prop or `theme` overrides — never via raw CSS files or inline `style` attributes.
- The MUI theme is the single configuration point for all visual decisions.

### Theme Configuration

The theme is defined once in `apps/web/src/lib/theme.ts` and injected at the app root via `ThemeProvider`. No component imports color values, spacing, or typography directly — all values come from the theme via `useTheme()` or the `sx` prop token system.

---

## 3. Layout System

### Global Structure

```
┌─────────────────────────────────────────────────────────────┐
│                        Top App Bar                          │
│  [Logo]  [Page Title]                    [User] [Alerts]   │
├──────────────┬──────────────────────────────────────────────┤
│              │                                              │
│  Navigation  │              Main Content Area              │
│  Rail /      │                                              │
│  Drawer      │   [Breadcrumb]                              │
│              │   [Page Header]                             │
│  - Dashboard │   [Content]                                 │
│  - Daily     │                                             │
│  - Reports   │                                             │
│  - Metrics   │                                             │
│  - Alerts    │                                             │
│  - Insights  │                                             │
│              │                                             │
└──────────────┴─────────────────────────────────────────────┘
```

### Navigation

- **Desktop (≥1200px):** Navigation Drawer (permanent, 240px wide). MUI `Drawer` variant `permanent`.
- **Tablet (900–1199px):** Navigation Rail (72px wide). MUI `Drawer` variant `permanent` with collapsed state.
- **Mobile (<900px):** Bottom Navigation Bar. MUI `BottomNavigation`.

Navigation items are role-filtered at render time. A role that cannot access Reports does not see a Reports nav item.

### Top App Bar

- MUI `AppBar` with `position="fixed"`.
- Left: OrgOS wordmark + current page title.
- Right: global alert bell (`Badge` with unread count), user avatar with role chip.
- Background: `theme.palette.surface` (not primary color).

### Main Content Area

- Max content width: `1440px`, centered with `margin: auto`.
- Page padding: `24px` horizontal, `32px` vertical on desktop. `16px` on mobile.
- Section spacing: `32px` between major sections. `16px` between cards within a section.

### Dashboard Layout Principles

Dashboards always render sections in this fixed vertical order:

1. **Risk Section** — active alerts, unresolved interventions. Collapsed if empty.
2. **Metrics Section** — KPI cards in a responsive grid.
3. **Insights Section** — AI-generated insight cards.
4. **Data Section** — tables, timelines, raw entry lists.

This order is mandatory. It reflects the information priority hierarchy.

### Hierarchical Data Display

Data drill-down follows the organizational hierarchy:

```
Organization View
  └── Program View
        └── Department View
              └── Individual View
                    └── Daily Entry View
```

Each level is a separate route. Breadcrumbs always show the current position in the hierarchy. A user never sees data above their role's scope level.

---

## 4. Component System

All components live in `packages/ui/src/components/`. Each component is exported from `packages/ui/src/index.ts`. Components are never re-implemented in individual modules.

---

### MetricCard

Displays a single KPI value with trend indicator.

**Structure:**
```
┌───────────────────────────┐
│  [Icon]  Metric Label     │
│                           │
│  [Primary Value]          │
│  [Trend Arrow] [Delta %]  │
│  [Subtitle / Period]      │
└───────────────────────────┘
```

**Props:**
```ts
interface MetricCardProps {
  label: string;
  value: string | number;
  unit?: string;
  trend?: "up" | "down" | "neutral";
  delta?: string;        // e.g. "+12%"
  period?: string;       // e.g. "vs last week"
  icon?: SvgIconComponent;
  loading?: boolean;
}
```

**Rules:**
- Trend up = `theme.palette.success.main` arrow.
- Trend down = `theme.palette.error.main` arrow. (Context determines if down is bad — caller sets `trend` accordingly.)
- Value uses `typography.headlineMedium`.
- Label uses `typography.labelLarge`.
- When `loading` is true, renders MUI `Skeleton` in place of value and trend.
- MUI component base: `Card` with `elevation={0}` and `variant="outlined"`.

---

### RiskCard

Displays an active alert or unresolved intervention.

**Structure:**
```
┌────────────────────────────────────────┐
│  [Severity Chip]          [Timestamp]  │
│  [Alert Type Icon]  Risk Title         │
│  Description text                      │
│  [Assignee]              [Action CTA]  │
└────────────────────────────────────────┘
```

**Props:**
```ts
interface RiskCardProps {
  type: AlertType;
  severity: Severity;
  title: string;
  description?: string;
  assignee?: string;
  createdAt: Date;
  onResolve?: () => void;
  onAssign?: () => void;
  loading?: boolean;
}
```

**Rules:**
- `CRITICAL` severity: left border `4px solid theme.palette.error.main`. Background tinted `error` container color.
- `HIGH` severity: left border `4px solid theme.palette.warning.main`.
- `MEDIUM` / `LOW`: standard outlined card.
- Always rendered before MetricCards in any section.
- MUI base: `Card` with `variant="outlined"`.

---

### InsightCard

Displays an AI-generated insight.

**Structure:**
```
┌────────────────────────────────────┐
│  ✦ AI Insight      [Confidence %]  │
│  Insight headline                  │
│  Body text narrative               │
│  [Source period label]             │
└────────────────────────────────────┘
```

**Props:**
```ts
interface InsightCardProps {
  headline: string;
  body: string;
  confidence: number;   // 0–1, displayed as percentage
  period: string;
  loading?: boolean;
}
```

**Rules:**
- Always labeled with "AI Insight" badge using `theme.palette.tertiary`.
- Confidence below 0.6 renders a `LOW CONFIDENCE` chip in `theme.palette.warning`.
- Never displayed before RiskCards or MetricCards in page hierarchy.
- MUI base: `Card` with `variant="outlined"`.

---

### InterventionCard

Displays an active intervention requiring human action.

**Structure:**
```
┌────────────────────────────────────────────┐
│  [Status Chip]  [Severity Chip]            │
│  Issue Type                                │
│  [Assignee Avatar + Name]                  │
│  Notes preview                             │
│  [Mark In Progress]  [Mark Resolved]       │
└────────────────────────────────────────────┘
```

**Props:**
```ts
interface InterventionCardProps {
  id: string;
  issueType: string;
  severity: Severity;
  status: InterventionStatus;
  assigneeName: string;
  notes?: string;
  createdAt: Date;
  onStatusChange?: (id: string, status: InterventionStatus) => void;
  loading?: boolean;
}
```

**Rules:**
- `OPEN` status: outlined card with `error` tint.
- `IN_PROGRESS` status: outlined card with `warning` tint.
- `RESOLVED` status: outlined card, subdued — `text.disabled` color for body text.
- Action buttons use `Button` variant `text` — not `contained`.
- MUI base: `Card` with `variant="outlined"`.

---

### StatusChip

Displays entity state inline.

**Props:**
```ts
interface StatusChipProps {
  status: ReportStatus | EntryStatus | InterventionStatus;
  size?: "small" | "medium";
}
```

**Color mapping:**

| Status | Color Token |
|--------|------------|
| DRAFT | `default` (gray) |
| UNDER_REVIEW | `warning` |
| APPROVED | `success` |
| PUBLISHED | `primary` |
| SUBMITTED | `info` |
| PROCESSING | `warning` |
| COMPLETE | `success` |
| FLAGGED | `error` |
| OPEN | `error` |
| IN_PROGRESS | `warning` |
| RESOLVED | `success` |

**Rules:**
- MUI base: `Chip` with `size` prop.
- Never use custom colors outside the mapping above.
- Always use `variant="filled"` for active states, `variant="outlined"` for terminal states (RESOLVED, PUBLISHED).

---

### DashboardGrid

Responsive layout container for cards.

**Props:**
```ts
interface DashboardGridProps {
  children: React.ReactNode;
  columns?: 1 | 2 | 3 | 4;  // max columns at desktop
  spacing?: number;
}
```

**Rules:**
- Implemented as MUI `Grid2` container.
- Column breakpoints: 1 col on mobile, 2 on tablet, up to `columns` on desktop.
- `spacing` defaults to `3` (24px).
- Never nest DashboardGrids more than one level deep.

---

### TimelineSwitcher

Switches between temporal views: Daily / Weekly / Monthly.

**Props:**
```ts
interface TimelineSwitcherProps {
  value: "daily" | "weekly" | "monthly";
  onChange: (value: "daily" | "weekly" | "monthly") => void;
  available?: ("daily" | "weekly" | "monthly")[];
}
```

**Rules:**
- MUI base: `ToggleButtonGroup` with `ToggleButton` children.
- Always positioned at the top-right of a dashboard section header.
- Does not trigger navigation — updates the current view in place.
- Unavailable periods are `disabled`, not hidden.

---

### DataTable

Displays structured tabular data.

**Props:**
```ts
interface DataTableProps<T> {
  rows: T[];
  columns: GridColDef[];   // MUI X DataGrid column definitions
  loading?: boolean;
  onRowClick?: (row: T) => void;
  pageSize?: number;
}
```

**Rules:**
- MUI base: `DataGrid` from `@mui/x-data-grid`.
- Always paginated. Default `pageSize` is 25.
- When `loading` is true, renders `DataGrid` with `loading` prop (built-in skeleton rows).
- Row click navigates to the detail view for that entity.
- No inline editing in DataTable — edits happen on dedicated detail pages.
- Column headers use `typography.labelMedium`.

---

### InsightPanel

Full-width AI context panel, used at the bottom of a dashboard or report page.

**Structure:**
```
┌──────────────────────────────────────────────────────────────┐
│  ✦ AI Analysis               [Period]         [Confidence]   │
│                                                              │
│  [Narrative text — multi-paragraph AI-generated summary]     │
│                                                              │
│  Key Signals:                                                │
│  • Signal 1                                                  │
│  • Signal 2                                                  │
│                                                              │
│  Prompt version: extraction-v1         [Expand / Collapse]   │
└──────────────────────────────────────────────────────────────┘
```

**Props:**
```ts
interface InsightPanelProps {
  narrative: string;
  signals?: string[];
  period: string;
  confidence: number;
  promptVersion: string;
  loading?: boolean;
  defaultExpanded?: boolean;
}
```

**Rules:**
- MUI base: `Accordion` with `disableGutters`.
- Always collapsed by default unless `defaultExpanded` is true.
- Prompt version is always visible — it is an audit field.
- Low confidence (< 0.6) renders a warning banner inside the panel.
- Never placed above MetricCards or RiskCards in page hierarchy.

---

## 5. Data Visualization Rules

### Display Priority Order

Every dashboard section, every report view, every detail page renders content in this order:

```
1. Risks (RiskCards, unresolved interventions)
2. Metrics (MetricCards, KPI grids)
3. Insights (InsightCards, InsightPanel)
4. Raw Data (DataTable, entry lists)
```

This order is mandatory. It is never reversed or reordered for aesthetic reasons.

### How Metrics Are Displayed

- Single KPI values: `MetricCard`.
- Multiple KPIs for one entity: `DashboardGrid` of `MetricCards`, max 4 columns.
- Trend over time: MUI X `LineChart` or `BarChart`. Chart titles use `typography.titleMedium`.
- Comparative metrics (department vs. department): MUI X `BarChart`, horizontal orientation.
- All charts include axis labels. No chart is ever rendered without a title and axis labels.

### How Trends Are Shown

- Trends are indicated by directional arrows on `MetricCard` + a delta value.
- Trend lines in charts use `theme.palette.primary.main` for the main series.
- Comparison series use `theme.palette.secondary.main`.
- Risk-correlated series use `theme.palette.error.main`.
- No more than 3 series on a single chart.

### How Risks Are Highlighted

- `CRITICAL` alerts: persistent banner at top of page using MUI `Alert` with `severity="error"`. Not dismissable until resolved.
- `HIGH` alerts: `RiskCard` at top of risk section with error-tinted border.
- `MEDIUM` alerts: `RiskCard` in standard outlined style.
- `LOW` alerts: listed in a collapsible `LOW PRIORITY` accordion at the bottom of the risk section.

### How Hierarchy Is Preserved

- Org-level views show only aggregated metrics — no individual-level data.
- Department-level views show department aggregates + individual breakdowns.
- Individual views show that person's entries and extracted metrics only.
- Drill-down is always a navigation action (route change), never a modal or inline expand.
- Breadcrumbs always reflect the current hierarchy level.

---

## 6. Color System

OrgOS uses Material Design 3 color roles exclusively. No arbitrary hex values in component code.

### Color Role Usage

| Role | Token | Usage |
|------|-------|-------|
| Primary | `theme.palette.primary` | CTAs, active navigation, key actions |
| Secondary | `theme.palette.secondary` | Secondary actions, comparison data series |
| Tertiary | `theme.palette.tertiary` | AI insight labels, accent for intelligence layer |
| Error | `theme.palette.error` | Critical alerts, FLAGGED states, risk highlights |
| Warning | `theme.palette.warning` | High alerts, IN_PROGRESS states, low confidence |
| Success | `theme.palette.success` | APPROVED states, positive trends, resolved items |
| Info | `theme.palette.info` | SUBMITTED states, informational notices |
| Surface | `theme.palette.background.paper` | Card backgrounds |
| Background | `theme.palette.background.default` | Page background |
| Outline | `theme.palette.divider` | Card borders, table dividers |
| On-Surface | `theme.palette.text.primary` | Primary text |
| On-Surface Variant | `theme.palette.text.secondary` | Secondary text, labels, captions |
| Disabled | `theme.palette.text.disabled` | Inactive controls, resolved items |

### Rules

- Color values are never hardcoded in component files. Always use theme tokens.
- Semantic meaning is preserved across light and dark modes by using role tokens, not hex values.
- Do not use `primary` color for destructive actions. Use `error`.
- Do not use `success` color for non-terminal states.

---

## 7. Typography System

OrgOS uses the Material Design 3 type scale via MUI's typography system.

### Scale Mapping

| MD3 Role | MUI Variant | Usage |
|----------|-------------|-------|
| Display Large | `typography.displayLarge` | Reserved — not used in app UI |
| Display Medium | `typography.displayMedium` | Reserved — not used in app UI |
| Display Small | `typography.displaySmall` | Reserved — not used in app UI |
| Headline Large | `typography.h3` | Page titles |
| Headline Medium | `typography.h4` | Section titles, MetricCard values |
| Headline Small | `typography.h5` | Card titles, panel headers |
| Title Large | `typography.h6` | Sub-section headers |
| Title Medium | `typography.subtitle1` | Chart titles, table headers |
| Title Small | `typography.subtitle2` | Card subtitles, group labels |
| Body Large | `typography.body1` | Primary body text, report narrative |
| Body Medium | `typography.body2` | Secondary body text, descriptions |
| Body Small | `typography.caption` | Timestamps, metadata |
| Label Large | `typography.button` | Button labels, strong labels |
| Label Medium | `typography.overline` | Column headers, category labels |
| Label Small | — | Not used |

### Rules

- Font family is configured once in the MUI theme. No `fontFamily` overrides in component code.
- Do not use `h1` or `h2` in application UI — reserved for marketing/landing pages only.
- Text is never bolded via inline style. Use the correct type scale variant instead.
- Line height and letter spacing come from the theme. Never override them in component code.

---

## 8. Interaction Rules

### Hover States

- Interactive cards: `elevation` increases from `0` to `2` on hover. Achieved via MUI `Card` `sx` with `:hover` transition.
- Table rows: `background-color` changes to `theme.palette.action.hover`.
- Navigation items: MUI `ListItemButton` handles hover state natively — do not override.
- Buttons: MUI handles hover via `ripple` — do not suppress `disableRipple` without explicit reason.

### Loading States

- All data-fetching components must handle a `loading` prop.
- When `loading` is true: render MUI `Skeleton` matching the component's layout exactly.
  - MetricCard loading: two `Skeleton` lines (value + label).
  - DataTable loading: `DataGrid` native loading state.
  - InsightPanel loading: `Skeleton` with `variant="rectangular"` matching panel height.
- Do not use spinners for inline content loading. Spinners are reserved for full-page transitions only.
- Full-page loading (route transitions): MUI `LinearProgress` at the top of the `AppBar`.

### Status Changes

- State mutations (approve, resolve, assign) trigger an optimistic UI update immediately.
- If the mutation fails, the state reverts and a `Snackbar` with `severity="error"` is shown.
- On success: `Snackbar` with `severity="success"`, `autoHideDuration={3000}`.
- `StatusChip` transitions animate using MUI `Fade`.

### Alerts and Feedback

- Transient feedback (action success/failure): MUI `Snackbar` + `Alert`, anchored `bottom-center`.
- Persistent system alerts (unresolved CRITICAL issues): MUI `Alert` with `severity="error"` pinned below the top `AppBar`. Cannot be dismissed by the user — only resolved by resolving the underlying issue.
- Confirmation dialogs (destructive actions only): MUI `Dialog` with explicit "Cancel" and destructive-labeled confirm button. Confirm button uses `color="error"`.
- Form validation errors: MUI `TextField` `error` + `helperText` props. Never use a toast for form validation.

### Empty States

- When a section has no data, render a centered empty state with:
  - A Material Symbol icon (subdued, `fontSize="large"`).
  - A `typography.body1` message explaining why the section is empty.
  - An optional CTA if the user can take an action to populate the section.
- Never render an empty card grid or empty table without an empty state.

---

## 9. Role-Based UI Behavior

The UI renders only what a given role's data scope permits. No data outside scope is shown in any form.

### Scope Hierarchy

| Role | Dashboard Scope | Report Scope | Intervention Scope |
|------|-----------------|--------------|--------------------|
| INSTRUCTOR | Own entries only | None | None |
| DEPARTMENT_HEAD | Department | Department weekly + monthly | Department |
| PROGRAM_LEAD | Program aggregates | Program rollups | Program |
| PROGRAM_MANAGER | Cross-dept program | Cross-dept rollups | Cross-dept |
| HEAD_OF_OPERATIONS | Full org | All reports | All |
| ADMIN | Full org + system config | All reports | All |

### Navigation by Role

| Nav Item | Instructor | Dept Head | Program Lead | Program Mgr | Head of Ops | Admin |
|----------|-----------|-----------|-------------|-------------|-------------|-------|
| Dashboard | Own | Dept | Program | Program | Org | Org |
| Daily Inputs | Submit + history | View dept | — | — | — | All |
| Reports | — | Dept reports | Program rollups | Program rollups | All | All |
| Metrics | Own | Dept | Program | Program | Org | All |
| Alerts | — | Dept | Program | Program | Org | All |
| Insights | — | Dept | Program | Program | Org | All |
| Interventions | — | Dept | Program | Program | Org | All |
| Admin | — | — | — | — | — | ✓ |

### Role-Aware Component Behavior

- `MetricCard`: renders the value appropriate to the user's scope. The same component is used at all levels — the parent page passes the correctly scoped data.
- `DataTable`: row-level actions (approve, assign) are rendered only if the user's role permits that action. A role that cannot approve reports does not see an approve button — the column is not rendered.
- `InterventionCard`: `onStatusChange` prop is only passed if the user is the assignee or has management scope. Otherwise the card is read-only.
- `InsightPanel`: always read-only for all roles.

---

## 10. Anti-Patterns

The following patterns are prohibited. A pull request introducing any of these will be rejected.

### Framework and Styling

- **No Tailwind CSS.** Not for a single helper class. Not "just this once."
- **No raw CSS files** in component directories. All styles via MUI `sx` or `theme` overrides.
- **No inline `style` attributes** on MUI components. Use `sx`.
- **No Bootstrap, Chakra UI, Radix, or any non-MUI component library** in the application UI layer.
- **No custom CSS utility classes.** No `className="flex items-center"` or equivalent.

### Component Discipline

- **No re-implementing existing components per feature.** If `MetricCard` exists in `packages/ui`, it is used everywhere. A second `KpiCard`, `StatCard`, or `NumberDisplay` component is not created.
- **No ad-hoc UI per module.** Module-specific components are only built if they do not duplicate a `packages/ui` primitive.
- **No hardcoded color values** in any component file. `#FF0000` is never acceptable — use `theme.palette.error.main`.
- **No hardcoded font sizes or weights.** Use the typography scale.
- **No suppressions of MUI defaults** (ripple, elevation, focus ring) without documented reason.

### Data Display

- **No duplicate metric displays.** A metric is shown once in its appropriate position in the hierarchy. It is not repeated in a summary card and a detail card on the same screen.
- **No data outside the user's role scope.** A component that receives data it should not show is a bug, not a design decision.
- **No skipping the display priority order.** Raw data tables do not appear above MetricCards. InsightPanels do not appear above RiskCards.
- **No charts without titles and axis labels.**
- **No modals for drill-down navigation.** Drill-down is always a route change.

### AI and Intelligence Layer

- **No displaying AI-generated content without a confidence indicator.**
- **No displaying AI-generated content without the prompt version.**
- **No presenting AI output as fact.** InsightCards and InsightPanels always carry the "AI Insight" label.

### Interaction

- **No toasts for form validation errors.** Use inline field errors.
- **No dismissable CRITICAL alert banners.** They persist until resolved.
- **No empty card grids.** Always render an empty state.
- **No optimistic updates without rollback on failure.**
