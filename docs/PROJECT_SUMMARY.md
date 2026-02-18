# Project Summary — Complex Mapper

> Last updated: 2026-02-18 | Test count: 621/621

---

## What We're Building

**Complex Mapper** is a client-side word-association research tool. A participant sees a stimulus word
and types the first association that comes to mind. The app measures reaction time, first-key latency,
backspaces, edits, and IME composition events per trial, then scores the session against statistical
outlier thresholds and clinical indicator codes.

Target users: clinicians, researchers, and individuals doing personal cognitive exploration.
**Not a diagnostic tool.** Results are for reflection and exploratory research only.

---

## Process / Methodology (AI-assisted build)

This repo is built via strict tickets + a verification gate.

- Canonical OS prompts: `docs/AI_CODING_OS_v3.3.md`
- Ticket template: `docs/TICKET_TEMPLATE.md`
- “PASS/FAIL” truth layer: `bash tools/verify` (preferred) or `node tools/verify.mjs` (fallback)
- In Lovable sandbox: `tools/verify-proxy.mjs` may SKIP unavailable oracles and must state SKIPs explicitly.

---

## Tech Stack

| Layer             | Technology                                             |
| ----------------- | ------------------------------------------------------ |
| UI                | React 18, TypeScript, Vite, Tailwind CSS               |
| Component library | shadcn/ui (Radix UI primitives)                        |
| State             | React hooks + localStorage (no server)                 |
| Charts            | Custom SVG (RtTimeline, RtHistogram, CiBreakdownChart) |
| Testing           | Vitest + React Testing Library                         |
| Verification      | 8-oracle pipeline (`tools/verify.mjs`)                 |

---

## Architecture

Strict three-layer system enforced by `tools/check-boundaries.ts`:
