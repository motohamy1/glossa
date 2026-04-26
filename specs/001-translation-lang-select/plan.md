# Implementation Plan: Translation Service Verification & Dynamic Language Selection

**Branch**: `001-translation-lang-select` | **Date**: 2026-04-26 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-translation-lang-select/spec.md`

## Summary

Verify the Argos Translate ML backend is operational (health check + test translation), then
replace the hardcoded language list in the Expo mobile app with a dynamic list fetched from the
backend's `/languages` endpoint. The app falls back to a static list when the backend is
unreachable. This enables extensibility — new languages added to the backend automatically appear
in the frontend without code changes.

## Technical Context

**Language/Version**: TypeScript 5.9 (frontend), Python 3.x (backend)
**Primary Dependencies**: Expo SDK 55, React Native 0.83, NativeWind v5, React Navigation; FastAPI, Argos Translate (backend)
**Storage**: None for this feature (no persistence; language list fetched on screen load)
**Testing**: jest + @testing-library/react-native (frontend); pytest + httpx (backend)
**Target Platform**: iOS 15+, Android 8+ (mobile); Linux/Docker (backend)
**Project Type**: mobile-app + API service
**Performance Goals**: 60 fps UI, <10s translation for <500 chars, <1s language list load, <2s health check
**Constraints**: Local network only (WiFi), Docker required, offline fallback, no new native dependencies
**Scale/Scope**: Single user local dev, 16 languages, ~100 chars typical input, 1 screen modified

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### I. Code Quality Standards
- **Status**: ✅ PASS
- **Assessment**: Modified file (`app/(tabs)/index.tsx` at 199 lines) stays under 300-line limit after adding fetch logic (estimated +30-40 lines). New hook file for language fetching will be extracted into `hooks/useLanguages.ts` to keep single-responsibility. TypeScript strict mode enabled (confirmed in `tsconfig.json`).

### II. Testing Standards
- **Status**: ✅ PASS (requires setup)
- **Assessment**: Testing infrastructure (jest) must be initialized. Unit tests for `useLanguages` hook; component test for translator screen covering happy path, loading, error, and empty states. These are captured in the task list.

### III. User Experience Consistency
- **Status**: ✅ PASS
- **Assessment**: Existing UI uses NativeWind classes consistently (bg-neutral-950, text-white, etc.). Dynamic language list preserves the same modal UX. Loading spinner already exists for translate button; new loading state needed for initial language fetch. Retry action needed for error states per constitution.

### IV. Performance Requirements
- **Status**: ✅ PASS
- **Assessment**: Language list fetch must use debounced API call (300ms per constitution) and cache with 5-min TTL. Language selection modal currently uses ScrollView (16 items, under 20-item threshold — no FlatList needed yet). No bundle size concerns (minimal new code).

### V. Type Safety & Linting
- **Status**: ✅ PASS
- **Assessment**: All new code TypeScript with explicit types. `any` forbidden — API response types defined as interfaces. `expo lint` and `npx tsc --noEmit` must pass with zero errors before merge.

### Technical Standards Compliance
- No new native dependencies needed — `fetch` is built-in; existing `Modal` from RN is sufficient.
- API communication uses typed `fetch` wrapper.
- No secure storage needed for this feature.

## Project Structure

### Documentation (this feature)

```text
specs/001-translation-lang-select/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
│   └── api-contract.md
├── checklists/
│   └── requirements.md  # Spec quality checklist
└── tasks.md             # Phase 2 output (NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
apps/
└── ml-service/
    └── main.py            # Backend FastAPI service (EXISTING, verified in this feature)

app/
├── (tabs)/
│   ├── _layout.tsx        # Tab layout (EXISTING, unchanged)
│   └── index.tsx          # Translator screen (MODIFIED: dynamic language fetch)
├── _layout.tsx            # Root layout (EXISTING, unchanged)
├── index.tsx              # Entry redirect (EXISTING, unchanged)
└── global.css             # NativeWind styles (EXISTING, unchanged)

hooks/
└── useLanguages.ts        # NEW: Custom hook for language list fetching + caching

types/
└── api.ts                 # NEW: Shared API response types (Language, HealthResponse, TranslateResponse)

components/
└── tw/
    └── index.tsx          # NativeWind component wrappers (EXISTING, unchanged)

tests/
├── hooks/
│   └── useLanguages.test.ts   # NEW: Unit test for language fetching hook
├── components/
│   └── TranslatorPage.test.tsx # NEW: Component test for translator screen
└── setup.ts                   # NEW: Jest setup file
```

**Structure Decision**: Option 3 (Mobile + API). The frontend lives in `app/` (Expo Router
convention) with shared hooks and types at root level. New `tests/` directory added at root
for both hook unit tests and component tests. Backend in `apps/ml-service/` is verified but
not modified in this feature — all changes are frontend-only.

## Complexity Tracking

> No constitution violations. All principles pass with documented compliance above.

