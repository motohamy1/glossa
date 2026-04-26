# Data Model: Translation Service Verification & Dynamic Language Selection

## Entities

### Language

Represents a single language supported by the translation engine.

| Field | Type | Description |
|-------|------|-------------|
| `name` | `string` | Display name in Title Case (e.g., "English", "French") |
| `code` | `string` | ISO 639-1 two-letter language code used internally (e.g., "en", "fr") |

**Identity**: Language is uniquely identified by its `code`. The `name` is derived from
the code via the `LANG_CODES` mapping and normalized to Title Case for display.

**Mapping**: The backend's `LANG_CODES` dictionary maps lowercase names to codes:
```
"english" → "en", "spanish" → "es", "french" → "fr", ...
```
The frontend normalizes names for display but sends names as-is in translation requests
(the backend lowercases on receipt).

**Validation**:
- `name` must be one of the keys in the backend's `LANG_CODES` dictionary.
- `code` must be a valid ISO 639-1 two-letter code.

**Lifecycle**: Languages are determined by the models installed in Argos Translate.
They do not change at runtime unless the Docker container is rebuilt with new models.
There is no create/update/delete lifecycle — languages are read-only from the frontend
perspective.

---

### LanguageList

Represents the collection of available languages fetched from the backend.

| Field | Type | Description |
|-------|------|-------------|
| `languages` | `string[]` | Array of language names (lowercase), e.g., `["english", "spanish", "french"]` |
| `source` | `"api" \| "static"` | Origin of the list: `"api"` if fetched successfully, `"static"` if fallback |
| `fetchedAt` | `number` | Unix timestamp in milliseconds of when the list was fetched (for TTL check) |

**States**:
- **Loading**: Initial state before first fetch completes.
- **Loaded (API)**: Fetch succeeded; `source = "api"`, `fetchedAt` set.
- **Loaded (Fallback)**: Fetch failed; `source = "static"`, static list used.
- **Stale**: Previous fetch succeeded but TTL expired; re-fetch triggered on next mount.

---

### HealthStatus

Represents the health check response from the backend.

| Field | Type | Description |
|-------|------|-------------|
| `status` | `"ok" \| "error"` | Overall service status |
| `model_loaded` | `boolean` | Whether the Argos Translate engine has finished loading models |

**States**:
- `model_loaded: false` → Translation engine still loading; `/ml/translate` returns 503.
- `model_loaded: true` → Translation engine ready; `/ml/translate` accepts requests.

---

### TranslationRequest

User-initiated action to translate text.

| Field | Type | Description |
|-------|------|-------------|
| `source_text` | `string` | Text to translate (any Unicode, max length TBD by backend) |
| `source_lang` | `string` | Source language display name (e.g., "English") |
| `target_lang` | `string` | Target language display name (e.g., "French") |

**Validation**:
- `source_text` must not be empty.
- `source_lang` and `target_lang` must be valid keys in `LANG_CODES` (backend validates).

---

### TranslationResponse

The result returned by the backend after translation.

| Field | Type | Description |
|-------|------|-------------|
| `translated_text` | `string` | The translated output text |
| `error` (optional) | `string` | Error message if translation failed (frontend-derived, not from API) |

**Note**: The backend returns `{ translated_text: string }` on success. On failure, the
frontend captures the HTTP error and constructs an `error` field for display. The
`TranslatedResponse` entity is a frontend concept combining both success and error cases.

---

## Relationships

```
LanguageList ──contains──▶ Language (1:N)
Language ──used by──▶ TranslationRequest (source_lang, target_lang reference Language.name)
TranslationRequest ──produces──▶ TranslationResponse
HealthStatus ──precondition for──▶ TranslationRequest (model_loaded must be true)
```

---

## TypeScript Interface Definitions

```typescript
// types/api.ts

export interface LanguageResponse {
  languages: string[];
}

export interface HealthResponse {
  status: string;
  model_loaded: boolean;
}

export interface TranslateRequestBody {
  source_text: string;
  source_lang: string;
  target_lang: string;
}

export interface TranslateResponseBody {
  translated_text: string;
}

export interface TranslationResult {
  translated_text?: string;
  error?: string;
}

export interface LanguageListState {
  languages: string[];
  source: 'api' | 'static';
  fetchedAt: number | null;
}

export type FetchState = 'idle' | 'loading' | 'loaded' | 'error';
```

## Validation Rules

| Rule | Enforcement |
|------|-------------|
| Source text must not be empty | Frontend: button disabled + early return in handler |
| Language must be in LANG_CODES | Backend: HTTP 400 with supported languages list |
| Model must be loaded before translate | Backend: HTTP 503 with retry guidance |
| Language list empty → fallback | Frontend: use static list if API returns empty array |
| Cache TTL expired → re-fetch | Frontend: `useLanguages` hook checks `Date.now() - fetchedAt > 300000` |
