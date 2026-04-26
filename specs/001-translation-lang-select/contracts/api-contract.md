# API Contract: Glossa ML Service

**Base URL**: `http://<HOST>:8000` (configurable by developer, default `http://192.168.1.7:8000`)

All endpoints use JSON request/response bodies. Content-Type: `application/json`.

---

## GET /health

Check if the ML service is running and the translation engine is ready.

**Request**: No body.

**Response 200** (service running):
```json
{
  "status": "ok",
  "model_loaded": true
}
```

**Response 200** (service running, models still loading):
```json
{
  "status": "ok",
  "model_loaded": false
}
```

**Response (connection failure)**: No response — network error. Frontend treats as
unreachable.

**Timing**: MUST respond within 2 seconds.

---

## GET /languages

Return the list of languages available for translation.

**Request**: No body.

**Response 200** (models loaded — returns installed languages):
```json
{
  "languages": [
    "English", "Spanish", "French", "German",
    "Italian", "Portuguese", "Russian", "Chinese",
    "Japanese", "Korean", "Arabic", "Hindi",
    "Turkish", "Dutch", "Polish", "Swedish"
  ]
}
```

**Response 200** (models not yet loaded — returns LANG_CODES keys):
```json
{
  "languages": [
    "english", "spanish", "french", "german",
    "italian", "portuguese", "russian", "chinese",
    "japanese", "korean", "arabic", "hindi",
    "turkish", "dutch", "polish", "swedish"
  ]
}
```

> **Note**: Language name casing differs depending on whether Argos Translate is loaded
> (`installed_languages` returns proper names) or not (`LANG_CODES` keys are lowercase).
> The frontend MUST normalize all names to Title Case for display.

**Timing**: MUST respond within 1 second.

---

## POST /ml/translate

Translate text from source language to target language.

**Request Body**:
```json
{
  "source_text": "Hello world",
  "source_lang": "English",
  "target_lang": "Spanish"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `source_text` | string | Yes | Text to translate, any Unicode, no explicit max length |
| `source_lang` | string | Yes | Source language name (case-insensitive) |
| `target_lang` | string | Yes | Target language name (case-insensitive) |

**Response 200** (success):
```json
{
  "translated_text": "Hola mundo"
}
```

**Response 400** (unsupported language pair):
```json
{
  "detail": "Unsupported language pair: X -> Y. Supported: english, spanish, ..."
}
```

**Response 503** (engine not ready):
```json
{
  "detail": "Translation engine is still loading. Please wait."
}
```

**Response 500** (translation failure):
```json
{
  "detail": "Translation failed: <error details>"
}
```

**Timing**: MUST return within 10 seconds for texts under 500 characters.

---

## Frontend Contract: Language List Hook

### `useLanguages()`

Custom React hook for fetching and caching the language list.

```typescript
// Signature
function useLanguages(): {
  languages: string[];
  fetchState: FetchState;
  source: 'api' | 'static';
  errorMessage?: string;
  refetch: () => void;
}
```

**States**:

| `fetchState` | `languages` | UI Behavior |
|-------------|-------------|-------------|
| `idle` | `[]` | Initial mount, fetch not yet started |
| `loading` | `[]` | Show skeleton/spinner in language selector area |
| `loaded` | `["English", "Spanish", ...]` (from API) | Display list in modal, `source = "api"` |
| `error` | `["English", "Spanish", ...]` (static fallback) | Display list in modal, `source = "static"`, unobtrusive indicator |

**Cache Rules**:
- TTL: 5 minutes (300,000 ms) from `fetchedAt` timestamp.
- On mount: if cached data exists and TTL not expired, skip fetch, return cached.
- On mount: if no cache or TTL expired, fetch from `/languages`.
- On error: fall back to built-in static list.

**Static Fallback List** (mirrors `apps/ml-service/main.py` `LANG_CODES`):
```typescript
const STATIC_LANGUAGES = [
  'English', 'Spanish', 'French', 'German',
  'Italian', 'Portuguese', 'Russian', 'Chinese',
  'Japanese', 'Korean', 'Arabic', 'Hindi',
  'Turkish', 'Dutch', 'Polish', 'Swedish'
];
```

---

## Error Handling Contract

| Scenario | Backend Response | Frontend Handling |
|----------|-----------------|-------------------|
| Backend unreachable | Network error (fetch throws) | Use static list for languages; show network-error guidance for translation |
| `/languages` returns empty `[]` | `{ "languages": [] }` | Use static fallback list |
| Engine not loaded | 503 | Show "engine loading" message in output area |
| Unsupported language pair | 400 | Show supported languages in error message |
| Internal translation error | 500 | Show user-friendly error with retry suggestion |
| Request timeout (>10s) | No response | Show timeout error, stop loading spinner |
