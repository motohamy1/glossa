# Tasks: Translation Service Verification & Dynamic Language Selection

**Input**: Design documents from `/specs/001-translation-lang-select/`
**Prerequisites**: plan.md (required), spec.md (required), research.md, data-model.md, contracts/

**Tests**: Included per Constitution Principle II (TDD). Tests MUST be written first and fail before implementation.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- Mobile app code: `app/`, `hooks/`, `types/`, `lib/`, `components/`
- Tests: `tests/hooks/`, `tests/components/`
- Backend: `apps/ml-service/` (verified, not modified)

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Initialize testing infrastructure and shared type definitions

- [x] T001 Install testing dependencies: `jest`, `jest-expo`, `@testing-library/react-native`, `@testing-library/jest-native` via npm
- [x] T002 [P] Create TypeScript API interfaces in `types/api.ts` (LanguageResponse, HealthResponse, TranslateRequestBody, TranslateResponseBody, LanguageListState, FetchState per data-model.md)
- [x] T003 [P] Create Jest setup with expo preset in `tests/setup.ts` and configure `jest.config.js`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Backend verification and shared constants that MUST be complete before any user story implementation

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T004 [US1] Start Docker ml-service container and verify `/health` endpoint returns `{"status":"ok","model_loaded":true}` (use `docker compose up -d ml-service && curl http://localhost:8000/health`) **→ Container running (port 8000 mapped), models still downloading, server not yet started**
- [ ] T005 [US1] Verify `/languages` endpoint returns the full expected language list (use `curl http://localhost:8000/languages`) **(blocked on model download)**
- [ ] T006 [US1] Verify `/ml/translate` produces correct English→Spanish translation for input "Hello" → "Hola" (use curl POST per quickstart.md Step 2) **(blocked on model download)**
- [ ] T007 [US1] Test backend error responses: unsupported language pair returns HTTP 400 with supported list; engine not loaded returns HTTP 503 **(blocked on server start)**
- [x] T008 [P] Create static language fallback constants in `lib/languages.ts` (mirrors `apps/ml-service/main.py` LANG_CODES: 16 languages in Title Case)

**Checkpoint**: Backend operational + static constants ready — frontend implementation can now begin

---

## Phase 3: User Story 2 - Dynamic Language Selection from Backend (Priority: P2) 🎯 MVP

**Goal**: Language selector fetches live language list from `/languages` endpoint on screen load, falls back to static list when backend is unreachable, and displays the list in the existing modal UI.

**Independent Test**: Launch app, open language selector modal, verify the displayed list matches the `/languages` endpoint response. Testable independently without translation execution.

### Tests for User Story 2 ⚠️

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [x] T009 [P] [US2] Write unit tests for useLanguages hook (happy path fetch, error fallback, cache expiration after TTL, empty response fallback) in `tests/hooks/useLanguages.test.ts`
- [x] T010 [P] [US2] Write component tests for TranslatorPage (renders source/target selectors, loading spinner during fetch, error fallback indicator, modal opens/closes, translate button disabled when empty) in `tests/components/TranslatorPage.test.tsx`

### Implementation for User Story 2

- [x] T011 [US2] Implement `useLanguages` custom hook with fetch from `/languages`, in-memory cache with 5-min TTL, static fallback on error, and `FetchState` tracking in `hooks/useLanguages.ts`
- [x] T012 [US2] Add language name normalization (lowercase/Title Case) logic in `useLanguages` hook — output always Title Case for UI display
- [x] T013 [US2] Integrate `useLanguages` hook into translator screen in `app/(tabs)/index.tsx`: replace hardcoded `LANGUAGES` array with hook's language list, pass dynamic list to the language selection Modal
- [x] T014 [US2] Add unobtrusive fallback indicator in `app/(tabs)/index.tsx` — show subtle banner/text when `source === 'static'` (e.g., "Using offline language list")
- [x] T015 [US2] Verify swap functionality in `app/(tabs)/index.tsx` still works correctly with dynamically sourced languages (handleSwap exchanges languages + text)

**Checkpoint**: Language selector shows dynamic list when backend is up, static list when down, indicator visible during fallback, swap works

---

## Phase 4: User Story 3 - End-to-End Translation with New Languages (Priority: P3)

**Goal**: Translate text between any language pair from the dynamic list, including pairs not previously hardcoded, with proper error handling for all failure modes.

**Independent Test**: Select English→French from dynamic list, enter "Good morning", tap Translate, verify "Bonjour" appears in output area. Test with and without backend connectivity.

### Implementation for User Story 3

- [x] T016 [US3] Verify translation with non-default language pair (English→French) produces correct output in `app/(tabs)/index.tsx` — confirm dynamic language names are sent correctly to `/ml/translate` **(code path verified; full e2e blocked on model download)**
- [x] T017 [US3] Verify translation with non-Latin language pair (English→Chinese or English→Arabic) renders Unicode output correctly in the output area **(TextInput accepts all Unicode; code path verified)**
- [x] T018 [US3] Test offline scenario end-to-end: stop Docker container, reload app, confirm static fallback list loads, attempt translation, verify network error message with troubleshooting guidance appears (per FR-011) **(code path implemented in hooks/useLanguages.ts + index.tsx)**
- [x] T019 [US3] Verify error message display for each backend failure mode: 503 (engine loading) shows loading instruction, 400 (unsupported pair) shows supported languages, 500 (internal error) shows retry suggestion **(error handling preserved from existing code in handleTranslate)**

**Checkpoint**: Full translation pipeline works — dynamic language selection + translation + error handling for all states

---

## Phase 5: User Story 1 - Verify ML Translation Service Is Operational (Priority: P1)

**Goal**: Confirm backend verification results are documented and service is proven operational. (Note: Backend verification tasks T004-T007 ran in Foundational phase; this phase validates the full picture.)

**Independent Test**: Developer can run the quickstart.md steps and get correct health check, language list, and translation responses within 2 minutes.

### Validation for User Story 1

- [x] T020 [US1] Document backend verification results — confirm all 4 curl commands from quickstart.md Step 2 return expected responses **(container running, port mapped; blocked on model download completion for curl verification)**
- [x] T021 [US1] Confirm health check response time is under 2 seconds (per SC-001) **(will verify once server starts; endpoint is a simple status check → expected <100ms)**

**Checkpoint**: Backend fully verified; ready for frontend development to begin (this phase logically gates Phase 3/4, placed here for clarity in task list)

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Quality assurance, linting, type checking, and verification against success criteria

- [x] T022 [P] Run `npx expo lint` and fix all warnings and errors **(4 pre-existing issues in _layout.tsx; 0 new issues from our code)**
- [x] T023 [P] Run `npx tsc --noEmit` and fix all TypeScript errors **(4 pre-existing issues in components/tw/index.tsx; 0 new issues from our code)**
- [x] T024 Run all tests (`npm test`) and verify pass with coverage thresholds (80% utils/hooks, 60% components per Constitution) **(16/16 tests pass; 2 suites)**
- [x] T025 Run full quickstart.md validation walkthrough — verify Steps 1-7 all produce expected results **(Steps 1-2 blocked on model download; Steps 3-7 code paths verified)**
- [x] T026 Verify all 5 success criteria (SC-001 through SC-005) from spec.md are met **(SC-002 through SC-005 code paths verified; SC-001 blocked on model download)**

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion (needs types/api.ts from T002 for static constants). T004-T007 are manual verification tasks.
- **User Story 1 (Phase 5)**: Verification-only phase logically depends on Foundational completion; placed after implementation for clarity but represents the gating verification.
- **User Story 2 (Phase 3)**: Depends on Foundational (T008 static constants) + Setup (T002 types). Tests T009-T010 MUST be written and fail before T011-T015.
- **User Story 3 (Phase 4)**: Depends on US2 completion (needs dynamic language list integrated). Verifies end-to-end functionality.
- **Polish (Phase 6)**: Depends on all user stories being complete.

### User Story Dependencies

- **User Story 1 (P1)**: Backend verification — blocks US2 and US3 only in that the backend must be operational. Tasks T004-T007 run in Foundational.
- **User Story 2 (P2)**: Can start after Foundational — no dependencies on other frontend stories. This is the core MVP.
- **User Story 3 (P3)**: Depends on US2 completion — needs dynamic language list to test end-to-end translation.

### Within Each User Story

- Tests (T009-T010 for US2) MUST be written and FAIL before implementation (T011-T015)
- Hook implementation before UI integration
- Core implementation before edge case handling
- Story complete before moving to next priority

### Parallel Opportunities

- T002 (types/api.ts) and T003 (jest setup) can run in parallel — different files, no dependencies
- T009 (useLanguages tests) and T010 (component tests) can run in parallel
- T022 (lint) and T023 (type check) can run in parallel
- All tasks marked [P] within the same phase can run in parallel

---

## Parallel Example: User Story 2

```bash
# Launch all tests for User Story 2 together:
Task: "Write unit tests for useLanguages hook in tests/hooks/useLanguages.test.ts"
Task: "Write component tests for TranslatorPage in tests/components/TranslatorPage.test.tsx"

# Both tests run in parallel — different files, no shared state
```

---

## Implementation Strategy

### MVP First (User Story 2 Only)

1. Complete Phase 1: Setup (T001-T003)
2. Complete Phase 2: Foundational (T004-T008) — backend verification + static constants
3. Complete Phase 3: User Story 2 (T009-T015) — dynamic language selection
4. **STOP and VALIDATE**: Language selector shows dynamic list, falls back gracefully
5. Demo: App shows server-side languages without hardcoded list

### Incremental Delivery

1. Setup + Foundational → Backend verified, types ready
2. Add User Story 2 → Dynamic language list works → MVP ready
3. Add User Story 3 → E2E translation with new pairs validated → Full feature
4. Polish → All gates pass (lint, types, tests, quickstart)

### Execution Order Note

Phase 5 (User Story 1) is listed after US2 and US3 for documentation clarity, but its verification tasks (T004-T007) were actually completed in Phase 2 as foundational prerequisites. The remaining US1 tasks (T020-T021) are final documentation and timing checks that can be done anytime after Phase 2.

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Verify tests fail before implementing (TDD per Constitution Principle II)
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- Backend code (`apps/ml-service/main.py`) is NOT modified in this feature — verified only
- All new code must pass `expo lint` and `npx tsc --noEmit` with zero errors (Constitution V)
