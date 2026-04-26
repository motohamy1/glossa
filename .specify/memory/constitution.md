<!--
  Sync Impact Report
  ==================
  Version change: N/A (template) → 1.0.0 (initial ratification)
  Principles added:
    I. Code Quality Standards
    II. Testing Standards
    III. User Experience Consistency
    IV. Performance Requirements
    V. Type Safety & Linting
  Sections added:
    - Technical Standards
    - Development Workflow
    - Governance
  Sections removed: none (initial fill)
  Templates requiring updates:
    ✅ plan-template.md — Constitution Check section references principles; aligned with quality/testing/UX/performance gates
    ✅ spec-template.md — Requirements and success criteria sections align with testing/UX/performance principles
    ✅ tasks-template.md — Task phases cover testing, performance, and polish; aligns with workflow section
    ⚠ agent-file-template.md — generic placeholder; no references to constitution yet (deferred to first plan run)
    ✅ checklist-template.md — generic; no constitution references to update
    ⚠ README.md — still uses default Expo template; should be updated with project-specific info (deferred)
  Follow-up TODOs: none
-->

# Glossa Constitution

## Core Principles

### I. Code Quality Standards
All code MUST be written in TypeScript with strict mode enabled. Every component, hook, and
utility function MUST be written in a self-contained, single-responsibility module. Shared logic
MUST be extracted into reusable hooks or utility files under a `src/` or `lib/` directory.
Naming MUST follow React/TypeScript conventions: PascalCase for components, camelCase for
functions and variables, UPPER_SNAKE_CASE for constants. Import ordering MUST follow:
React/Expo imports → third-party libraries → local imports, with a blank line between groups.
No file MUST exceed 300 lines; files approaching this limit MUST be split into focused modules.

### II. Testing Standards
All business logic, utility functions, and hooks MUST have unit tests. Every user-facing screen
MUST have a corresponding component test covering at minimum: (a) happy-path rendering,
(b) loading state, (c) error state, and (d) empty state where applicable. Integration tests MUST
cover critical user journeys: translation flow, language selection, and offline behavior. Tests
MUST be written BEFORE implementation (TDD cycle: write failing test → implement → refactor).
Code coverage MUST remain above 80% for utilities and services, and above 60% for UI components.
Do NOT merge PRs that decrease overall coverage.

### III. User Experience Consistency
All screens MUST use the shared design system (NativeWind utility classes via Tailwind v4 with
a centralized theme configuration). Spacing, typography, and color tokens MUST be accessed from
the design system — raw values MUST NOT be used. Every interactive element MUST provide visual
feedback (touch opacity, highlight, or haptic response via expo-haptics). Navigation transitions
MUST be consistent across the app using Expo Router's standard transition patterns. Loading
states MUST display a skeleton or spinner; empty states MUST include a descriptive message and
a suggested action. Error states MUST show a user-friendly message with a retry action where
applicable. The app MUST be usable on both light and dark color schemes without loss of contrast
or readability.

### IV. Performance Requirements
The app MUST maintain 60 fps during scroll, navigation transitions, and animations. Component
trees MUST be optimized: use React.memo for pure components, useMemo/useCallback for expensive
computations and stable callbacks, and FlatList/SectionList (not ScrollView) for lists exceeding
20 items. Bundle size MUST be monitored — no single screen's code-split chunk MUST exceed 200 KB
uncompressed. API calls to translation services MUST implement debouncing (minimum 300ms) and
caching with a TTL of at least 5 minutes. Images and assets MUST be optimized (WebP format
preferred, lazy-loaded via expo-image). The async storage layer MUST batch writes and throttle
reads to avoid blocking the JS thread. Offline mode MUST degrade gracefully: cached translations
served when network is unavailable, with a clear offline indicator.

### V. Type Safety & Linting
All code MUST pass `expo lint` (ESLint with expo config) and TypeScript compilation (`npx tsc
--noEmit`) with zero errors before merge. The `strict` flag in tsconfig.json MUST remain enabled.
Explicit `any` types ARE FORBIDDEN — use `unknown` with type narrowing, generics, or proper
interfaces instead. Props and state types MUST be explicitly defined (no `React.FC` without
generic, no inferred `useState` without explicit type parameter). Each Expo Router route MUST
export typed search params. ESLint rules MUST NOT be disabled with `eslint-disable` without a
documented justification reviewed by at least one other developer.

## Technical Standards

- **Runtime**: Expo SDK 55+ with React Native 0.83+, targeting iOS 15+ and Android 8+.
- **Language**: TypeScript 5.x in strict mode; all new code written in TypeScript.
- **Styling**: NativeWind v5 (Tailwind CSS v4) with centralized theme in `tailwind.config` or
  equivalent; `react-native-css` for runtime style processing.
- **Navigation**: Expo Router (file-based routing) with React Navigation bottom tabs.
- **State Management**: React Context + useReducer for shared state; no external state library
  unless justified by complexity (e.g., Zustand for high-frequency updates).
- **Storage**: `expo-secure-store` for sensitive data; `AsyncStorage` for non-sensitive cache.
- **API Communication**: `fetch` with typed wrapper; request/response schemas defined with
  TypeScript interfaces; API keys MUST NOT be committed — use environment variables.
- **No new native module dependencies without explicit review, unless provided by Expo's
  first-party ecosystem (`expo-*` packages preferred over bare React Native community modules).

## Development Workflow

- **Branching**: Feature branches off `main` with the pattern `###-short-description` (e.g.,
  `042-translation-history`); PRs required for all changes.
- **Code Review**: At least one approving review required before merge; reviewer MUST verify
  adherence to this constitution's principles, including lint pass, type check, and test
  coverage thresholds.
- **Quality Gates (per PR)**:
  1. `expo lint` passes with zero errors and zero warnings.
  2. `npx tsc --noEmit` passes with zero errors.
  3. All existing tests pass; new tests included for new logic.
  4. No decrease in code coverage percentages.
  5. Visual regression: screenshots of changed screens attached for UX review.
- **Commits**: Follow conventional commits (`feat:`, `fix:`, `refactor:`, `test:`, `docs:`,
  `chore:`). Squash-merge preferred for feature branches.

## Governance

This constitution supersedes all other development practices and conventions. Any deviation
from its principles MUST be documented in the implementation plan's "Complexity Tracking"
section with a justification and an analysis of rejected simpler alternatives.

**Amendment Process**: Propose changes via PR against this file (`constitution.md`); amendments
require (a) the PR description explaining the rationale, (b) an impact assessment on existing
templates and guidance files, and (c) approval from at least one other developer. The Sync Impact
Report comment at the top of this file MUST be updated with every amendment.

**Versioning**: Follows semantic versioning:
- MAJOR: Removal or redefinition of a core principle or governance rule.
- MINOR: Addition of a new principle, section, or materially expanded guidance.
- PATCH: Clarifications, wording fixes, typo corrections.

**Compliance Review**: Every feature plan (via `plan-template.md`) includes a "Constitution Check"
gate that MUST pass before Phase 0 research. The checklist generated before each feature MUST
include items verifying alignment with each applicable principle.

**Version**: 1.0.0 | **Ratified**: 2026-04-26 | **Last Amended**: 2026-04-26
