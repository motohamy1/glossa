# Quickstart: Translation Service Verification & Dynamic Language Selection

## Prerequisites

- Docker installed and running
- Node.js 18+ with npm
- Expo CLI (`npx expo`)
- The mobile device/emulator and the PC on the same WiFi network

## Step 1: Start the ML Translation Service

```bash
# From repo root
docker compose up -d ml-service
```

Wait ~30-60 seconds for Argos Translate to download and install language models.
Monitor progress:

```bash
docker compose logs -f ml-service
```

Look for: `"Argos Translate ready with all language packages."`

## Step 2: Verify Backend Health

```bash
# Check health endpoint
curl http://localhost:8000/health
# Expected: {"status":"ok","model_loaded":true}

# Check available languages
curl http://localhost:8000/languages
# Expected: {"languages":["English","Spanish","French", ...]}

# Test a translation
curl -X POST http://localhost:8000/ml/translate \
  -H "Content-Type: application/json" \
  -d '{"source_text":"Hello","source_lang":"English","target_lang":"Spanish"}'
# Expected: {"translated_text":"Hola"}
```

## Step 3: Configure Mobile App IP Address

Edit `app/(tabs)/index.tsx` and update `ML_BASE_URL`:
```typescript
const ML_BASE_URL = 'http://<YOUR_PC_IP>:8000';
```
Find your PC's LAN IP: `ip addr show` (Linux) or `ipconfig` (Windows).

## Step 4: Start the Mobile App

```bash
npm install
npx expo start
```

Press `a` for Android or `i` for iOS to launch on device/emulator.

## Step 5: Verify Dynamic Language Selection

1. The translator screen loads. The app fetches languages from the backend.
2. Tap the source language (default "English") — a modal slides up with the full
   language list fetched from the `/languages` endpoint.
3. Select "French" as target language.
4. Type "Good morning" in the input area.
5. Tap **Translate** — "Bonjour" appears in the output area.
6. Tap the swap button — languages swap, text swaps between fields.
7. Verify the swap works correctly with text content preserved.

## Step 6: Verify Offline Fallback

1. Stop the Docker container: `docker compose stop ml-service`
2. Reload the app. The language list falls back to the static list.
3. An unobtrusive indicator shows (e.g., "Using offline language list").
4. Attempt a translation — the app shows the network error guidance.
5. Start the container again: `docker compose start ml-service`
6. Navigate away and back to the translator tab — languages refresh from backend.

## Step 7: Run Tests

```bash
# Frontend tests
npm test

# Verify lint and types
npx expo lint
npx tsc --noEmit
```

Expected: All tests pass, zero lint errors, zero type errors.

## Troubleshooting

| Problem | Check |
|---------|-------|
| "Can't reach ML service" | Docker running? Container up? WiFi same network? Correct IP? |
| Translation returns 503 | Wait for Argos Translate to finish loading (`docker compose logs ml-service`) |
| Languages not showing | Check `/languages` endpoint with curl |
| App crashes on load | Run `npx expo start --clear` to clear Metro cache |
