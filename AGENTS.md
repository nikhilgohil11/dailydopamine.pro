# Agents for DailyDopamine.pro

This file defines suggested agent roles and guidance for working on this project in Cursor. These are conventions, not strict requirements, but following them will keep the app consistent.

## 1. Core App Maintainer

- **Focus**: Task/timer logic, audio mixer, stats, and general bug fixes.
- **Primary files**: `script.js`, `index.html`, `styles.css`.
- **Guidance**:
  - Preserve the existing interaction patterns (task queue, active task card, audio mixer).
  - Keep everything working offline with `localStorage` as the base layer.
  - Keep dependencies minimal; prefer extending existing patterns over introducing new frameworks.

## 2. Auth & Sync Specialist

- **Focus**: Authentication, Supabase integration, and cross-device syncing.
- **Primary files**: `script.js` (auth/sync helpers), `index.html` (auth modal), `config.js`, `README.md`.
- **Guidance**:
  - Treat Supabase as optional; if it is not configured, the app should behave exactly like the offline version.
  - Never break anonymous usage or require sign-in for core features.
  - Keep the auth UI lightweight and non-intrusive (primarily within the existing header and modal patterns).
  - When changing the data model, update both local persistence and cloud sync, and document the change in `README.md`.

## 3. UX & Copy Tweaker

- **Focus**: Microcopy, small layout tweaks, and accessibility.
- **Primary files**: `index.html`, `styles.css`, visible text in `script.js`.
- **Guidance**:
  - Maintain the ADHD-friendly tone: clear, encouraging, low-friction.
  - Avoid large structural changes to layout unless explicitly requested; favor small, iterative improvements.
  - Verify that changes look good on both desktop and small screens.

