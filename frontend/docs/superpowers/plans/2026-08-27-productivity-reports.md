# Productivity Reports Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a read-only daily, weekly, and monthly productivity report center with lightweight charts and automatic insights.

**Architecture:** A pure analytics module owns time ranges and aggregation. A range-scoped API query supplies source rows, chart components render SVG/CSS visualizations, and a lazy-loaded page composes the report.

**Tech Stack:** React 19, TypeScript 6, Supabase JS, Tailwind CSS 4, native SVG.

**Spec:** `docs/superpowers/specs/2026-08-27-productivity-reports-design.md`

## Global Constraints

- Use Asia/Shanghai logical days beginning at 04:00.
- Do not add a database table, SQL migration, or chart dependency.
- Keep all report operations read-only and range-scoped.
- Do not commit or push changes.

---

### Task 1: Analytics contract

**Files:**
- Create: `src/services/reportAnalytics.test.ts`
- Create: `src/services/reportAnalytics.ts`

**Interfaces:**
- Produces: `getReportRange`, `shiftReportAnchor`, `aggregateReport`, and report source/result types.

- [ ] Write failing tests for logical daily/weekly/monthly bounds, bucket labels, totals, rankings, and score clamping.
- [ ] Run `npm test` and confirm failure because the module is absent.
- [ ] Implement the pure date and aggregation functions.
- [ ] Run `npm test` and confirm all tests pass.

### Task 2: Range-scoped data source

**Files:**
- Modify: `src/services/api.ts`

**Interfaces:**
- Consumes: `ReportRange`.
- Produces: `fetchReportSource(range): Promise<ReportSource>`.

- [ ] Add four parallel range queries for sessions, completed tasks, daily plans, reviews, and token records.
- [ ] Select only fields consumed by analytics and cache by start/end bounds.
- [ ] Throw query errors so the page can show retry state.
- [ ] Run `npm run build`.

### Task 3: Visual components and report page

**Files:**
- Create: `src/components/ReportCharts.tsx`
- Create: `src/pages/Reports.tsx`

**Interfaces:**
- Consumes: `ProductivityReport` and report range navigation callbacks.
- Produces: responsive report UI for daily, weekly, and monthly modes.

- [ ] Implement metric cards, score ring, area chart, hourly bars, donut charts, ranking bars, activity cells, insights, loading, empty, and error states.
- [ ] Use stable SVG view boxes and CSS grids so charts resize without a dependency.
- [ ] Run `npm run build`.

### Task 4: Navigation and final verification

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/components/Layout.tsx`

**Interfaces:**
- Produces: lazy route `/reports` and “数据报告” sidebar entry.

- [ ] Add lazy route and navigation entry using the existing chart icon.
- [ ] Run `npm test` and `npm run build`.
- [ ] Open `http://localhost:3000/reports`, inspect desktop and mobile layouts, and verify tab/period navigation.
