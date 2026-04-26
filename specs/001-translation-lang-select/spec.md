# Feature Specification: Translation Service Verification & Dynamic Language Selection

**Feature Branch**: `001-translation-lang-select`
**Created**: 2026-04-26
**Status**: Draft
**Input**: User description: "Verify translation service and implement dynamic language selection from backend ML service, replacing hardcoded English/Spanish with full language list"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Verify ML Translation Service Is Operational (Priority: P1)

As a developer, I need to confirm that the Argos Translate engine inside the Docker
container is correctly initialized, models are loaded, and it can produce a valid
translation so that the mobile app has a working backend to connect to.

**Why this priority**: If the translation engine is broken or unreachable, no translation
feature works at all. This is the foundational dependency for all other user stories.

**Independent Test**: Can be fully tested by sending a health check request and a sample
translation request to the backend endpoints and verifying successful responses — this
requires only the backend service running, no frontend changes needed.

**Acceptance Scenarios**:

1. **Given** the Docker container is started, **When** a GET request is sent to the
   `/health` endpoint, **Then** the response returns status `ok` and `model_loaded: true`
   within 60 seconds of container startup.
2. **Given** the translation engine is ready (`model_loaded: true`), **When** a POST
   request is sent to `/ml/translate` with `source_text: "Hello"`, `source_lang: "English"`,
   `target_lang: "Spanish"`, **Then** the response returns `translated_text: "Hola"`
   (or equivalent correct translation) with HTTP 200.
3. **Given** the translation engine is still loading (`model_loaded: false`), **When** a
   POST request is sent to `/ml/translate`, **Then** the response returns HTTP 503 with a
   clear "still loading" message.
4. **Given** an unsupported language pair is requested, **When** a POST request is sent to
   `/ml/translate` with languages not in `LANG_CODES`, **Then** the response returns HTTP
   400 with a message listing supported languages.

---

### User Story 2 - Dynamic Language Selection from Backend (Priority: P2)

As a mobile app user, I want the language selector to show all languages actually supported
by the backend translation service, fetched dynamically, so that I can translate between
any available language pair without being limited to a hardcoded list.

**Why this priority**: This is the core UX improvement — replacing the hardcoded list
with live data makes the app extensible and ensures the frontend never shows languages
the backend cannot handle.

**Independent Test**: Can be fully tested by launching the app, tapping the source or
target language selector, and verifying the list shown matches the response from the
`/languages` backend endpoint. No translation execution needed — the language list
fetching and display can be tested independently.

**Acceptance Scenarios**:

1. **Given** the app is launched and the backend `/languages` endpoint is reachable,
   **When** the translator screen loads, **Then** the app fetches the language list from
   the backend and displays it in the language selection modal.
2. **Given** the app is launched and the backend `/languages` endpoint is unreachable
   (network error, service down), **When** the translator screen loads, **Then** the app
   falls back to the built-in static language list and displays an unobtrusive indicator
   that languages may be limited.
3. **Given** the language modal is open, **When** the user selects a language (e.g.,
   "French") as source, **Then** the source language updates immediately and the modal
   closes, showing the selected language in the selector bar.
4. **Given** the user has selected "French" as source and "English" as target, **When**
   the user taps the swap button, **Then** source becomes "English" and target becomes
   "French", and the input/output text areas swap accordingly.

---

### User Story 3 - End-to-End Translation with New Languages (Priority: P3)

As a mobile app user, I want to successfully translate text between language pairs that
were not previously hardcoded (e.g., English to French, German to Italian), so that the
app is genuinely useful for multi-language translation beyond the original limited set.

**Why this priority**: This validates the entire pipeline — backend health, dynamic
language list, and actual translation — proving the integration is complete and functional.

**Independent Test**: Can be fully tested by selecting a non-default language pair (e.g.,
English → French), entering text, tapping Translate, and verifying a correct translation
appears. Can also be tested by checking that languages from the backend's `/languages`
response are selectable and translatable.

**Acceptance Scenarios**:

1. **Given** the user has selected "English" as source and "French" as target (both from
   the dynamic language list), **When** the user enters "Good morning" and taps Translate,
   **Then** the app displays "Bonjour" (or equivalent correct French translation) in the
   output area with no error.
2. **Given** the user has selected "German" as source and "Italian" as target, **When**
   the user enters "Guten Tag" and taps Translate, **Then** the app displays a correct
   Italian translation with no error.
3. **Given** text has been translated and appears in the output area, **When** the user
   taps the swap button, **Then** the translated text moves to the input area and the
   original input text moves to the output area, with source and target languages swapped.
4. **Given** the backend is unreachable during a translation attempt, **When** the user
   taps Translate, **Then** the app displays the existing network error message with
   troubleshooting guidance (Docker, WiFi, container status) without crashing.

---

### Edge Cases

- What happens when the `/languages` endpoint returns an empty list? The app MUST fall
  back to the built-in static language list.
- What happens when the user selects the same language for both source and target? The
  app SHOULD allow it (identity translation) or display a gentle warning. Current behavior
  is to allow it and let the backend handle it.
- What happens when the backend `/languages` response includes languages with different
  casing or naming than the frontend's static list? The frontend MUST normalize language
  names to a consistent casing for display (e.g., Title Case) while preserving the
  backend's internal naming for translation requests.
- How does the app handle Unicode/non-Latin input (Chinese, Arabic, Japanese) in source
  text? The text input MUST accept and display all Unicode characters; translation MUST
  return correctly rendered text.
- What happens when the translation takes longer than the current request timeout? The
  app MUST show the loading indicator and handle timeout gracefully with a user-friendly
  error message.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST provide a `/health` endpoint that reports whether the
  translation engine is loaded and ready (`model_loaded: true/false`).
- **FR-002**: The system MUST provide a `/languages` endpoint that returns the complete
  list of languages available in the translation engine.
- **FR-003**: The mobile app MUST fetch the language list from the backend's `/languages`
  endpoint on translator screen load.
- **FR-004**: The mobile app MUST use a dynamic language list sourced from the backend
  instead of the hardcoded `LANGUAGES` array when the backend is reachable.
- **FR-005**: The mobile app MUST fall back to a static built-in language list when the
  `/languages` endpoint is unreachable or returns an error.
- **FR-006**: The language selection modal MUST display all languages from the active
  language list (dynamic or fallback) and allow selection for both source and target.
- **FR-007**: The swap functionality MUST exchange both the selected languages AND the
  text content between source and target fields.
- **FR-008**: The translate button MUST be disabled (greyed out, non-interactive) when
  the source text is empty or when a translation is already in progress.
- **FR-009**: The system MUST validate language pairs before sending translation requests
  and return a clear error message for unsupported combinations (HTTP 400 with list of
  valid languages).
- **FR-010**: The app MUST display a loading spinner while a translation is in progress
  and restore the translate button when complete (success or error).
- **FR-011**: The app MUST show network-specific error guidance when the backend is
  unreachable (Docker status, WiFi connection, container instructions).
- **FR-012**: The app MUST display user-friendly error text in the output area when
  translation fails (instead of an empty state or technical stack trace).

### Key Entities

- **Language**: Represents a supported language for translation. Attributes: display name
  (e.g., "English"), internal code (e.g., "en") used by the translation engine. The
  frontend uses display names; the backend maps display names to codes via `LANG_CODES`.
- **Translation Request**: User-initiated action with source text, source language, and
  target language. The backend processes this and returns translated text.
- **Translation Response**: The result of a translation request containing the translated
  text string and any error information if the request failed.

### Non-Functional Requirements

- **Performance**: The `/health` endpoint MUST respond within 2 seconds. The `/languages`
  endpoint MUST respond within 1 second. Translation requests MUST return within 10
  seconds for texts under 500 characters.
- **Availability**: The translation engine MUST report its ready/loading status within
  60 seconds of container startup.
- **Graceful Degradation**: The mobile app MUST remain functional (language selection,
  swap, text input) even when the backend is completely unreachable; only translation
  execution should fail with a clear error.
- **Compatibility**: The language list from the backend MUST be compatible with the
  frontend's language display format. Both systems MUST normalize language names
  consistently (case-insensitive matching).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A developer can verify the translation service is operational by running a
  health check and a test translation within 2 minutes of following instructions.
- **SC-002**: The language selector in the mobile app displays the complete list of
  languages from the backend within 3 seconds of the translator screen loading.
- **SC-003**: A user can select any language pair from the dynamic list and receive a
  correct translation within the expected time window (under 10 seconds for short text).
- **SC-004**: When the backend is unreachable, the app gracefully falls back to the static
  language list and displays a clear connection error on translation attempt — no crashes
  or blank screens.
- **SC-005**: 100% of supported language pairs listed by the backend's `/languages`
  endpoint are selectable in the frontend and produce valid translations.

## Assumptions

- The Docker container running the ML service is already configured and can be started
  via standard Docker commands. Container orchestration is out of scope for this feature.
- The backend's `LANG_CODES` dictionary in `apps/ml-service/main.py` is the authoritative
  source of supported languages. The frontend's static fallback list mirrors these
  languages.
- The mobile app and the ML service communicate over a local network (WiFi). The IP
  address configuration is handled by the developer and is out of scope for dynamic
  resolution in this feature.
- The existing translation UI layout (modal, swap button, input/output areas) is the
  target for modification — no full UI redesign is expected.
- Language pair coverage is limited to pairs where Argos Translate has models installed
  (currently: English to/from each language in the priority list). Direct translation
  between non-English pairs (e.g., French to German) may not be available unless
  explicitly installed.
- User language preferences are not persisted across app restarts in this phase.
  Persistence (e.g., saving last-used language pair) is deferred to a future feature.
