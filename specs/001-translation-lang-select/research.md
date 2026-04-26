# Research: Translation Service Verification & Dynamic Language Selection

## 1. Fetching & Caching Language List from Backend API

**Decision**: Use React Native's built-in `fetch` with a custom `useLanguages` hook that
implements in-memory caching with a 5-minute TTL.

**Rationale**:
- The constitution mandates API calls to translation services implement caching with a TTL
  of at least 5 minutes (Principle IV).
- No external HTTP client needed — `fetch` is built into React Native and sufficient for
  a single GET endpoint.
- In-memory caching (module-level `Map` + timestamp) avoids adding AsyncStorage dependency
  for this simple case. The language list is small (~16 strings) and changes very rarely
  (only when backend is rebuilt with new models).
- Screen-load fetch pattern: `useEffect` on mount triggers fetch; subsequent mounts within
  TTL return cached data without a network request.

**Alternatives Considered**:
- **SWR/React Query**: Overkill for a single endpoint with no mutations, no revalidation
  polling, and no pagination. Adds bundle weight.
- **AsyncStorage persistence**: Unnecessary complexity for a rarely-changing 16-item list.
  In-memory cache is lost on app restart, which is acceptable — the app re-fetches on next
  launch.
- **Expo's `NetInfo` for reconnection**: Deferred. The fetch-on-mount pattern with fallback
  to static list is sufficient for Phase 1. Connectivity-aware refresh is a future
  enhancement.

## 2. Testing Infrastructure Setup

**Decision**: Install `jest`, `jest-expo`, `@testing-library/react-native`, and
`@testing-library/jest-native`. Create a `tests/` directory at repository root.

**Rationale**:
- Constitution Principle II requires TDD: tests written before implementation.
- `jest-expo` provides the Expo-specific Jest preset (mocks for expo modules).
- `@testing-library/react-native` provides render/test utilities for React Native
  components without needing native APIs.
- Backend testing with `pytest` + `httpx` for the existing FastAPI endpoints is fast and
  well-supported. However, this feature's backend code (`main.py`) already exists and is
  not being modified — backend testing is verification-only (manual or script).

**Alternatives Considered**:
- **Detox (E2E)**: Heavyweight, requires native builds. Overkill for Phase 1 verification.
- **Vitest**: Not natively supported in React Native projects; jest-expo is the Expo
  recommended path.
- **No frontend tests**: Violates Constitution Principle II — rejected.

**Test Plan**:
| Test | Type | Scope |
|------|------|-------|
| `useLanguages.test.ts` | Unit | Hook: happy path fetch, error fallback, cache expiration, empty response |
| `TranslatorPage.test.tsx` | Component | Screen: renders, loading state, error state, modal opens, swap works, translate button disabled when empty |

## 3. Network State Handling & Fallback Strategy

**Decision**: Simple try/catch on fetch with immediate fallback to static list. No
reachability listener or retry mechanism in Phase 1.

**Rationale**:
- The spec requires fallback when backend is unreachable (FR-005). A try/catch around
  the `fetch` call is the simplest implementation.
- Adding a NetInfo listener for reconnection detection adds complexity without clear
  Phase 1 benefit — the user can navigate away and back to re-trigger the fetch.
- The static fallback list (hardcoded in the hook or a constants file) mirrors the
  backend's `LANG_CODES` from `apps/ml-service/main.py`, ensuring consistency when offline.

**Alternatives Considered**:
- **Polling/retry with exponential backoff**: Overkill for a local dev tool.
- **Expo NetInfo listener to auto-refresh**: Deferred to future phase when offline
  experience becomes a priority.
- **Manual "Refresh languages" button**: Adds unnecessary UI element for a 16-item list
  that almost never changes.

## 4. Language Name Normalization

**Decision**: The frontend normalizes language names to Title Case for display (e.g.,
"english" → "English", "chinese" → "Chinese") using a simple transform. The backend
accepts case-insensitive language names via `.lower()` match against `LANG_CODES` keys.

**Rationale**:
- The existing backend code at `apps/ml-service/main.py:105-106` already uses
  `.lower()` for case-insensitive matching.
- The existing frontend `LANGUAGES` array uses Title Case. The `/languages` endpoint
  returns lowercase names from `LANG_CODES` keys or installed language names from
  Argos Translate. Normalizing to Title Case maintains UI consistency.
- Transformation: word split on space, capitalize first letter of each word, rejoin.

## 5. No New Native Dependencies

**Decision**: Use only existing Expo/React Native built-in modules (`fetch`, `Modal`,
`useState`, `useEffect`) plus the already-installed `@expo/vector-icons` for swap icon.

**Rationale**:
- Constitution Technical Standards: "No new native module dependencies without explicit
  review, unless provided by Expo's first-party ecosystem."
- React Native's built-in `Modal` component already used in `index.tsx` for language
  selection — sufficient for this feature.
- No community picker library needed — the custom Modal with ScrollView approach is
  already implemented and works well for 16 items.
