# MONOPOMO Production Correctness and Performance Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans or superpowers:subagent-driven-development to implement this plan task-by-task.

**Goal:** 修复 MONOPOMO 的缓存并发、用户隔离、扭蛋与奖励安全、统计口径和主要页面性能问题，并通过构建与关键行为验证。

**Architecture:** 先建立用户隔离且可合并进行中请求的前端缓存层，再统一统计 RPC 的身份与逻辑日边界；随后将扭蛋和奖励写入收拢到服务端受控函数，最后处理历史查询分页、N+1 查询、索引和测试。现有页面结构尽量保持不变，修改通过独立 API 函数和 migration 接口接入。

**Tech Stack:** React 19, TypeScript, Vite, Supabase Postgres, Supabase Auth, PL/pgSQL, existing npm build toolchain.

**Spec:** `docs/superpowers/specs/2026-08-26-production-correctness-and-performance-design.md`

## Global Constraints

- 不执行 GitHub push、Cloudflare 部署或 Supabase 线上操作。
- 当前用户身份必须来自 `auth.uid()` 或已验证的 Supabase session。
- 逻辑日统一使用 `Asia/Shanghai`，每天凌晨 4 点切换。
- 不删除用户现有数据，不使用 destructive reset、checkout 或 hard reset。
- 每个生产代码改动必须先有对应失败测试或可执行的回归验证，再实现。
- SQL migration 文件必须可重复执行或使用 `IF NOT EXISTS` / `CREATE OR REPLACE` 保持幂等。

---

### Task 1: 建立缓存测试基础和用户隔离缓存接口

**Files:**
- Modify: `frontend/src/services/api.ts` — 缓存、用户缓存和失效函数。
- Create: `frontend/src/services/api.cache.test.ts` — 缓存并发、失败和用户隔离测试。
- Inspect: `frontend/package.json` — 确认现有测试命令和测试依赖；若没有测试运行器，使用项目已有工具链添加最小配置。

**Interfaces:**
- Produce `cached<T>(key, fetcher, ttl?, userId?)` behavior where concurrent calls share one Promise.
- Produce `clearUserCaches(userId?)` for logout/user switch.
- Keep existing `invalidate(...keys)` call sites working.

- [ ] **Step 1: Write the failing tests**

测试必须验证：同一用户同一 key 的两个并发调用只执行一次 fetcher；fetcher 失败后下一次调用可以重新执行；不同用户不会复用同一结果。

- [ ] **Step 2: Run the focused test and confirm the expected failure**

Run: `npm test -- api.cache.test.ts` from `frontend/`.

Expected: tests fail because the current cache does not track pending Promises and does not scope data by user.

- [ ] **Step 3: Implement the minimal cache changes**

Add a pending Promise map, include the authenticated user ID in cache keys, remove pending entries in `finally`, and add explicit cache clearing for auth transitions. Do not change unrelated API functions in this task.

- [ ] **Step 4: Run the focused test and confirm it passes**

Run: `npm test -- api.cache.test.ts`.

Expected: all cache tests pass with no unhandled rejection.

---

### Task 2: 统一认证状态和缓存失效

**Files:**
- Modify: `frontend/src/services/api.ts` — auth cache reset and write-operation invalidations.
- Inspect: `frontend/src/contexts/AuthContext.tsx` and `frontend/src/main.tsx` — locate sign-out/session-change events.
- Modify: the existing auth owner file only where required to clear API caches.
- Test: extend `frontend/src/services/api.cache.test.ts` for auth transition behavior.

**Interfaces:**
- Auth changes clear `_cachedUser`, completed data cache, and pending requests for the old user.
- Existing APIs preserve their return shapes.

- [ ] **Step 1: Add a failing test for auth transition cache clearing**
- [ ] **Step 2: Run the focused test and verify the failure**
- [ ] **Step 3: Wire cache clearing to sign-out and user changes**
- [ ] **Step 4: Add `gacha-summary`, dashboard, balance, task and reward invalidations to all relevant writes**
- [ ] **Step 5: Run cache and TypeScript checks**

Run: `npm test -- api.cache.test.ts` and `npm run build`.

---

### Task 3: Harden streak and dashboard RPCs

**Files:**
- Modify: `frontend/supabase/migrations/002_get_user_streak.sql` — identity, logical day, unlimited history and indexes.
- Modify: `frontend/supabase/migrations/003_dashboard_summary.sql` — remove unsafe assumptions and keep compatibility.
- Modify: `frontend/supabase/migrations/004_dashboard_progressive_loading.sql` — core/secondary response contracts.
- Modify: `frontend/src/services/api.ts` — typed RPC response normalization and error handling.
- Modify: `frontend/src/pages/Dashboard.tsx` — preserve progressive rendering on RPC failure.
- Test: `frontend/src/services/streak.test.ts` for date-boundary and streak result helpers.

**Interfaces:**
- `get_user_streak()` returns the current user's unlimited streak.
- `get_user_week_streak()` returns the current logical week's streak.
- `get_dashboard_core()` returns the core dashboard payload.
- `get_dashboard_secondary()` returns projects and sessions.

- [ ] **Step 1: Write failing pure-function tests for logical-day boundaries and streak gaps**
- [ ] **Step 2: Run them and verify they fail for the unimplemented test helpers**
- [ ] **Step 3: Implement shared date normalization helpers without changing the UI contract**
- [ ] **Step 4: Review and update RPC SQL to use `auth.uid()`, stable JSON fields, and the same `Asia/Shanghai` 04:00 boundary**
- [ ] **Step 5: Run focused tests and `npm run build`**

---

### Task 4: Harden `gacha_pull` and reward mutation boundaries

**Files:**
- Create: `frontend/supabase/migrations/006_harden_gacha_and_rewards.sql` — secure gacha function and controlled reward RPCs.
- Modify: `frontend/supabase/migrations/001_atomic_gacha_pull.sql` only if the new migration must replace its function signature safely.
- Modify: `frontend/src/services/api.ts` — call secure RPCs and remove direct arbitrary reward inserts.
- Modify: `frontend/src/pages/Gacha.tsx` and reward-producing pages only where API signatures require it.
- Create: `frontend/src/services/gacha.rules.test.ts` — deterministic client-side validation tests for allowed counts and response normalization.

**Interfaces:**
- `gacha_pull()` derives user and dates server-side and accepts only 1 or 10.
- Reward RPC accepts a controlled source/action, not arbitrary amount and source pairs.
- Existing UI receives the same `PullResult`, `TokenBalance`, and task response shapes.

- [ ] **Step 1: Write failing tests for count validation and reward action mapping**
- [ ] **Step 2: Run focused tests and confirm failure**
- [ ] **Step 3: Add SQL validation for identity, count, dates, and safe search path**
- [ ] **Step 4: Add controlled reward RPC and migrate frontend reward calls**
- [ ] **Step 5: Change token record policies so clients cannot insert arbitrary reward rows while reads remain user-scoped**
- [ ] **Step 6: Run focused tests and build**

---

### Task 5: Optimize Gacha and Dashboard read paths

**Files:**
- Modify: `frontend/supabase/migrations/005_gacha_summary.sql` — summary contract and month/day boundaries.
- Modify: `frontend/src/pages/Gacha.tsx` — core-first and background secondary loading.
- Modify: `frontend/src/services/api.ts` — summary cache and secondary invalidation.
- Modify: `frontend/src/pages/Dashboard.tsx` if final response normalization requires it.
- Test: extend cache and gacha rule tests for summary fallback and stale-data behavior.

**Interfaces:**
- `get_gacha_summary()` returns items, balance, today counts, and SSR status.
- Gacha history, tasks, streak detail and token records load after core content.
- A failed secondary request does not hide the core page.

- [ ] **Step 1: Add a failing test for core data being usable before secondary data resolves**
- [ ] **Step 2: Run it and verify the expected failure**
- [ ] **Step 3: Implement typed summary normalization and independent secondary loading state**
- [ ] **Step 4: Verify pull, claim, and SSR mutations invalidate the summary cache**
- [ ] **Step 5: Run focused tests and build**

---

### Task 6: Fix remaining full-history and N+1 queries

**Files:**
- Modify: `frontend/src/services/api.ts` — pagination, date ranges, aggregate queries and batched comments.
- Modify: `frontend/src/pages/DailyPlans.tsx` — month-scoped loading.
- Modify: `frontend/src/pages/PomodoroHistory.tsx` — paginated sessions and aggregate stats.
- Modify: `frontend/src/pages/Reviews.tsx` — deduplicated load path.
- Modify: `frontend/src/pages/Settings.tsx` — lazy/batched feedback comments.
- Modify: `frontend/src/pages/Tasks.tsx`, `frontend/src/pages/Projects.tsx`, `frontend/src/pages/Showcase.tsx`, `frontend/src/pages/QuickMemos.tsx` where the existing query is unbounded.

**Interfaces:**
- Existing screens keep current user-visible fields.
- Lists expose either page loading or a bounded recent-history result.
- Aggregate counters do not depend on loading all detail rows.

- [ ] **Step 1: Add regression tests for list limits and duplicate review loads**
- [ ] **Step 2: Run focused tests and verify failure**
- [ ] **Step 3: Add server-side limits/ranges to one page at a time**
- [ ] **Step 4: Replace Settings comment N+1 with batch/count loading**
- [ ] **Step 5: Run build and manually inspect each affected empty/loading state**

---

### Task 7: Add and verify database indexes

**Files:**
- Create: `frontend/supabase/migrations/007_performance_indexes.sql` — idempotent composite indexes.
- Inspect: `database/schema.sql` — document baseline indexes without rewriting historical migrations.

**Interfaces:**
- Indexes cover user + time/status/source filters used by the application.
- Migration is safe to run repeatedly.

- [ ] **Step 1: Write the migration with `IF NOT EXISTS` indexes**
- [ ] **Step 2: Inspect SQL for table/column consistency**
- [ ] **Step 3: Verify application query fields match the index definitions**
- [ ] **Step 4: Run the frontend build and record remaining performance warnings**

---

### Task 8: End-to-end verification and handoff

**Files:**
- Modify: `PROJECT_STATUS.md` — record completed fixes and remaining limitations.
- Modify: `PERFORMANCE_OPTIMIZATION_PLAN.md` — mark implemented items only after verification.
- Test: all frontend tests and production build.

- [ ] **Step 1: Run the complete test command from `frontend/`**
- [ ] **Step 2: Run `npm run build` and capture exit code/output**
- [ ] **Step 3: Inspect `git diff` and `git status` for unintended changes**
- [ ] **Step 4: Verify no commit or push was performed**
- [ ] **Step 5: Report files, tests, known warnings, and required Supabase migration order**
