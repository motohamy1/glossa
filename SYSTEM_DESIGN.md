# Glossa — Full System Design Document

> **Speckit-Style Specification-Driven Development (SDD)**  
> **Monorepo | Offline-First | Local LLM | Expo + Express + FastAPI**

---

## Table of Contents

1. [Constitution](#1-constitution)
2. [Monorepo Structure](#2-monorepo-structure)
3. [System Architecture](#3-system-architecture)
4. [Module Specifications (Speckit Format)](#4-module-specifications-speckit-format)
5. [Data Model Specification](#5-data-model-specification)
6. [API & WebSocket Contracts](#6-api--websocket-contracts)
7. [Frontend Architecture](#7-frontend-architecture)
8. [AI/ML Pipeline & Infrastructure](#8-aiml-pipeline--infrastructure)
9. [Security & Privacy](#9-security--privacy)
10. [Testing & Quality Assurance](#10-testing--quality-assurance)
11. [12-Week Implementation Roadmap](#11-12-week-implementation-roadmap)
12. [Open Decisions & Risks](#12-open-decisions--risks)

---

## 1. Constitution

### Project Principles

1. **Offline-First**: Core learning (lessons, flashcards, progress) must work without internet. Sync is optional.
2. **Privacy by Design**: All personal learning data stays on-device by default. Backend sync requires explicit opt-in with encryption.
3. **AI-Assisted, Not AI-Dependent**: Every LLM-powered feature has a deterministic fallback (templated content, static phrasebooks).
4. **Monorepo, Multi-language Stack**: TypeScript for application logic; Python only for ML model serving.
5. **Mobile-Native UX**: 60fps interactions, instant navigation, haptic feedback for reviews.
6. **Adaptive by Default**: The system continuously recomputes difficulty and pacing based on performance signals.

### Tech Stack Decisions

| Layer | Technology | Rationale |
|-------|-----------|-----------|
| Mobile | Expo (React Native) | Cross-platform, fast iteration, easy native module linking |
| Backend API | Express + TypeScript | Familiar, lightweight, strong typing with shared packages |
| ML Service | Python + FastAPI | Native HuggingFace ecosystem, streaming support |
| Local DB | SQLite (via `expo-sqlite`) | Zero-config, offline-first, relational data |
| Sync DB | PostgreSQL (backend) | Robust, handles multi-device opt-in sync |
| Cache | Redis (backend) | LLM prompt deduplication, session state |
| Local Storage | AsyncStorage + SQLite | AsyncStorage for auth tokens/settings; SQLite for structured data |
| State Management | Zustand | Lightweight, persists to AsyncStorage |
| Navigation | Expo Router | File-based routing, deep-linking ready |
| Styling | NativeWind (Tailwind RN) | Rapid UI development, design system consistency |

---

## 2. Monorepo Structure

```
glossa/
├── apps/
│   ├── mobile/                 # Expo SDK 50+ (React Native)
│   ├── backend/                # Express API server
│   └── ml-service/             # Python FastAPI LLM wrapper
├── packages/
│   ├── shared-types/           # Shared TS interfaces (Zod schemas)
│   ├── shared-utils/           # Date math, SM-2 algo, validators
│   └── ui-components/          # Shared RN component library
├── infra/
│   ├── docker/
│   │   ├── docker-compose.yml
│   │   ├── Dockerfile.backend
│   │   ├── Dockerfile.ml
│   │   └── Dockerfile.mobile-build
│   └── scripts/
│       ├── setup.sh
│       └── seed-local-model.sh
├── docs/
│   ├── specs/                  # Speckit feature specs (per module)
│   ├── api/
│   └── adr/                    # Architecture Decision Records
├── .specify/
│   ├── templates/
│   │   ├── spec.md
│   │   ├── plan.md
│   │   ├── tasks.md
│   │   └── checklist.md
│   ├── scripts/
│   └── config.json
└── package.json                # Root workspace config (pnpm or npm workspaces)
```

---

## 3. System Architecture

### High-Level Flow

```
+--------------+     +-----------------+     +------------------+
|   Mobile     |<----| Express Backend |<----|   PostgreSQL     |
|  (Expo/RN)   |     |  (Optional Sync)|     |   (Sync DB)      |
+------+-------+     +-----------------+     +------------------+
       |
       | Offline-First
       v
+--------------+     +-----------------+
|   SQLite     |     |  Local LLM      |
|  (On-Device) |<----|  FastAPI Svc    |
+--------------+     |  (Docker/Local) |
                     +-----------------+
```

### Communication Patterns

- **Mobile <-> Backend**: REST (HTTPS). Auth via JWT or anonymous UUID.
- **Mobile <-> ML Service**: HTTP on local network (`192.168.x.x:8000`) when self-hosting; or localhost during dev.
- **Backend <-> ML Service**: Internal network (if backend proxies); or mobile calls ML directly.
- **Live Conversation**: WebSocket between Mobile and ML Service for token streaming.

---

## 4. Module Specifications (Speckit Format)

Each module follows the Speckit triad: **Spec (WHAT/WHY) -> Plan (HOW) -> Tasks**.

---

### MOD-001: User Onboarding & Plan Management

#### Spec (WHAT/WHY)

**Description**: Multi-step onboarding flow that captures the user's learning goal, proficiency levels, time commitment, interests, and target language. Persists a `UserPlan` and triggers initial roadmap generation.

**User Stories**:
- US-001: As a new user, I want to select my period/Time to level up my level to be proficient as according to time selected the app will recommend the timeline and daily study tense time and so on so the app personalizes my journey.
- US-002: As a user, I want to state my current CEFR level and target level so the roadmap is realistic.
- US-003: As a user, I want to set daily minutes (10-90m) so daily targets match my schedule.
- US-004: As a user, I want to pick interest topics (food, travel, tech, sports) so lesson content is relevant.
- US-005: As a user, I want to edit my plan later without losing progress.

**Acceptance Criteria**:
- Onboarding completes in <= 5 steps with progress indicator.
- All fields validated before submission (e.g., targetLevel >= currentLevel).
- Plan edit triggers roadmap recomputation preserving completed days.
- Guest mode supported (anonymous UUID, local-only).

**UI/UX Notes**:
- Use swipeable cards or bottom-sheet steps.
- Show estimated completion date dynamically based on weeks + current date.
- Visual level selector (A1->C2) with description tooltips.

#### Plan (HOW)

**Technical Design**:
- Screen: `apps/mobile/app/onboarding/` with 5 sub-screens.
- State: Zustand store `useOnboardingStore` with persistence.
- API: `POST /plan` validates and returns `{ roadmap: Week[] }`.
- Roadmap recomputation: Backend sends `remainingWeeks` and `currentDay` to generator; completed days are frozen.

**Component Breakdown**:
- `GoalSelector` (radio cards)
- `LevelPicker` (CEFR slider)
- `TimeCommitmentStep` (minute slider)
- `InterestChips` (multi-select)
- `PlanReviewScreen` (summary + CTA)

**Data Flow**:
1. User fills steps -> Zustand accumulates draft.
2. Submit -> `POST /plan` -> Backend stores `UserPlan` -> Triggers `RoadmapGenerator` -> Returns `Roadmap`.
3. Mobile writes Roadmap to SQLite `roadmaps` table.

**Dependencies**: MOD-002 (Roadmap Generator)

**Risks & Mitigations**:
- *Risk*: User edits plan mid-course causing data loss. *Mitigation*: Recompute only future weeks; archive old roadmap version.
- *Risk*: Onboarding abandonment. *Mitigation*: Allow "Skip for now" with default plan (Conversational, A1->B1, 12 weeks, 15m/day).

#### Tasks

- [ ] Create `useOnboardingStore` with Zustand + persist (est: 4h)
- [ ] Build `GoalSelector`, `LevelPicker`, `TimeCommitmentStep`, `InterestChips` (est: 8h)
- [ ] Implement `POST /plan` route + validation (est: 6h)
- [ ] Implement `PUT /plan` with recomputation logic (est: 8h)
- [ ] Add onboarding navigation stack with progress bar (est: 4h)
- [ ] Write unit tests for validation logic (est: 4h)

---

### MOD-002: Roadmap Generator Engine

#### Spec (WHAT/WHY)

**Description**: Generates a week-by-week course outline with measurable objectives, daily targets, and themes based on the `UserPlan`. Uses rule-based scaffolding + LLM for content enrichment.

**User Stories**:
- US-006: As a user, I want to see my full learning roadmap in a calendar view.
- US-007: As a user, I want each week to have a clear theme so I know what I'm building toward.
- US-008: As a system, I want to detect if a user is ahead/behind schedule to adapt the roadmap.

**Acceptance Criteria**:
- Roadmap covers exactly `weeks` duration with 7 days per week.
- Each day specifies: 5-8 new vocab words, 3-4 phrases, optional grammar topic, practice minutes.
- JSON output validated against Zod schema before persistence.
- Recomputation preserves completed days and adjusts future days only.

#### Plan (HOW)

**Technical Design**:
- **Rule-based scaffold**: Pre-defined week themes per goal type (e.g., Travel weeks 1-4: Greetings, Directions, Food, Emergencies).
- **LLM enrichment**: Prompt fills in daily vocab/phrases specific to interests and level.
- **Template fallback**: If LLM fails, use static JSON templates by goal+level.

**Algorithm**:
1. Compute total days = `weeks * 7`.
2. Map CEFR progression (e.g., A1->A2 over 8 weeks = gradual difficulty ramp).
3. Assign weekly themes from static map.
4. For each day, call LLM with constrained prompt OR use template.
5. Validate output shape with Zod.
6. Persist `Roadmap` + `DailyTarget[]`.

**Component Breakdown**:
- `RoadmapService` (backend): orchestrates generation.
- `roadmapTemplates/` (static JSON per goal).
- `RoadmapValidator` (Zod schema enforcer).

**Data Flow**:
```
UserPlan -> RoadmapService -> [Template + LLM] -> Validation -> SQLite (mobile) + Postgres (sync)
```

**Dependencies**: MOD-001, MOD-003 (LLM Service)

**Risks & Mitigations**:
- *Risk*: LLM generates invalid JSON. *Mitigation*: Retry with temperature 0; fallback to template.
- *Risk*: Roadmap too rigid. *Mitigation*: Mark days as "compressible" for adaptive engine.

#### Tasks

- [ ] Design Zod schema for `Roadmap`, `Week`, `DailyTarget` (est: 3h)
- [ ] Create static roadmap templates for all 5 goals x 6 levels (est: 12h)
- [ ] Implement `RoadmapService.generate()` with LLM integration (est: 10h)
- [ ] Add validation middleware (est: 4h)
- [ ] Build calendar/week view UI in mobile (est: 10h)
- [ ] Implement ahead/behind detection algorithm (est: 6h)
- [ ] Add unit tests for generation + validation (est: 6h)

---

### MOD-003: AI Lesson Generator (Local LLM Pipeline)

#### Spec (WHAT/WHY)

**Description**: Generates daily lesson content (vocab, dialogues, grammar, quiz) aligned to the day's theme and user's level. Runs via local Python service wrapping HuggingFace models.

**User Stories**:
- US-009: As a user, I want fresh daily lessons generated for my level and interests.
- US-010: As a user, I want lessons to include realistic dialogues I can practice.
- US-011: As a system, I want to cache lessons so regeneration is avoided.

**Acceptance Criteria**:
- Lesson JSON contains: vocab list (word, translation, example), 2 dialogues (3-5 lines), optional grammar note, 5-question MCQ quiz.
- Generation time <= 15s on CPU (target: 5s on modest GPU/optimized model).
- Lessons cached in SQLite; only future lessons generated on-demand.
- Graceful fallback to templated lesson if LLM unavailable.

#### Plan (HOW)

**Technical Design**:
- **Model**: Primary `google/flan-t5-base` (~250M) for structured JSON generation.
- **Optimization**: Use `transformers` pipeline with `torch.compile` (PyTorch 2.0+) or export to ONNX via `optimum[onnxruntime]` for 2-3x CPU speedup.
- **Constrained Decoding**: Guide JSON output via regex or `outlines` library to prevent malformed JSON.
- **Caching**: Redis (backend) or in-memory LRU cache (ml-service) keyed by hash of prompt parameters.

**Prompt Strategy**:
```
You are a language lesson generator. Produce ONLY valid JSON.
Target: {targetLang}, Level: {level}, Theme: "{theme}", Day: {day}
Include: vocab[8], dialogues[2], grammarNote?, quiz[5 questions with options and correctAnswer].
JSON Schema: {...}
```

**Component Breakdown**:
- `LessonGenerator` (Python class): loads model, formats prompt, parses output.
- `LessonCache` (Redis/Memory): stores generated lessons.
- `LessonService` (Express): mobile-facing API.
- `LessonScreen` (RN): renders vocab, dialogues, grammar, quiz.

**Data Flow**:
```
Mobile requests /lesson/day/5 -> Backend checks cache -> ML Service generates -> Validate JSON -> Return -> Mobile renders
```

**Dependencies**: None (foundational service)

**Risks & Mitigations**:
- *Risk*: `flan-t5-base` produces low-quality or repetitive content. *Mitigation*: Maintain prompt versioning; A/B test prompts; allow manual override.
- *Risk*: CPU inference too slow for mobile-hotspotted LAN. *Mitigation*: Pre-generate next 7 days in background cron; use quantized model (`flan-t5-base` 8-bit).

#### Tasks

- [ ] Scaffold `apps/ml-service/` with FastAPI (est: 4h)
- [ ] Implement model loading + pipeline for `flan-t5-base` (est: 6h)
- [ ] Add prompt templates with Jinja2 (est: 4h)
- [ ] Implement JSON schema validation + retry logic (est: 6h)
- [ ] Add Redis caching layer (est: 4h)
- [ ] Build `POST /lesson/generate` endpoint (est: 4h)
- [ ] Create `LessonScreen` UI components (est: 12h)
- [ ] Implement lesson caching in mobile SQLite (est: 4h)
- [ ] Add fallback templated lesson generator (est: 6h)
- [ ] Write integration tests (est: 6h)

---

### MOD-004: Translation Service (Local LLM)

#### Spec (WHAT/WHY)

**Description**: Core translation feature powered by the local LLM (`flan-t5-base`) running in the ML service, with local caching and a static phrasebook fallback for offline use. No cloud translation APIs are used — everything stays on-premise or on-device.

**User Stories**:
- US-012: As a user, I want to translate text between my native and target language instantly using local AI.
- US-013: As a user, I want translation to work offline using cached results or a static phrasebook.

**Acceptance Criteria**:
- Translation served from local SQLite cache returns in < 100ms.
- Translation via local LLM returns in < 3s (CPU) or < 1s (GPU).
- Cache up to 10,000 translations locally (SQLite) with LRU eviction.
- Offline phrasebook contains top 2,000 common words/phrases per supported language pair.
- Graceful fallback chain: Cache -> Local LLM -> Static Phrasebook.

#### Plan (HOW)

**Technical Design**:
- **Local LLM Translation**: The ML service uses `flan-t5-base` with a translation prompt. T5 is pre-trained on translation tasks, making it suitable for this without extra fine-tuning.
- **Prompt Template**: `translate {sourceLang} to {targetLang}: {text}`
- **Caching**: All translations written to SQLite `translations_cache`. Hash key = `sha256(sourceLang + targetLang + text)`.
- **Offline Phrasebook**: JSON asset bundled with the app (`assets/phrasebooks/{langPair}.json`).

**Component Breakdown**:
- `TranslationService` (backend): proxies requests to ML service `/ml/translate`, handles caching.
- `MLTranslationEngine` (Python/FastAPI): loads `flan-t5-base`, runs translation prompt.
- `TranslationCache` (SQLite): `translations_cache` table with LRU eviction.
- `OfflinePhrasebook` (JSON asset): 2,000-word static dictionary.
- `TranslateScreen` (RN): text input, language swap, history.

**Data Flow**:
```
Input text -> Check SQLite cache (local) -> If miss, call backend /translate -> ML Service (flan-t5-base) -> Cache result -> Return
                                    |
                                    v
                        If ML service unreachable -> Search OfflinePhrasebook -> Return static result
```

**Dependencies**: MOD-003 (ML Service infrastructure)

**Risks & Mitigations**:
- *Risk*: `flan-t5-base` translation quality is lower than specialized models (e.g., NLLB, M2M100). *Mitigation*: Cache successful translations to reduce repeated poor results; allow users to flag bad translations for phrasebook updates.
- *Risk*: First-time translation for long sentences is slow on CPU. *Mitigation*: Cap input length (e.g., 200 chars); show "翻译中..." indicator; encourage shorter inputs.

#### Tasks

- [ ] Add `POST /ml/translate` endpoint to ML service with flan-t5 prompt (est: 4h)
- [ ] Implement `POST /translate` in backend with caching logic (est: 4h)
- [ ] Create SQLite `translations_cache` with LRU eviction (est: 3h)
- [ ] Generate offline phrasebook JSON assets (est: 8h)
- [ ] Build `TranslateScreen` with history + offline indicator (est: 8h)
- [ ] Add translation fallback chain logic (cache -> LLM -> phrasebook) (est: 4h)
- [ ] Write unit tests for cache + fallback logic (est: 3h)

---

### MOD-005: Spaced Repetition System (SM-2)

#### Spec (WHAT/WHY)

**Description**: Flashcard review system using SM-2 algorithm. Schedules reviews, tracks performance, and adapts intervals.

**User Stories**:
- US-014: As a user, I want to review flashcards daily so I retain vocabulary.
- US-015: As a user, I want the system to show me cards I'm about to forget.
- US-016: As a user, I want to rate cards (again/hard/good/easy) to personalize scheduling.

**Acceptance Criteria**:
- SM-2 implemented per spec: easeFactor clamped 1.3-2.5, interval updates correct.
- Due cards calculated daily at 00:00 local time.
- Review session shows progress (cards remaining, accuracy).
- Cards generated automatically from lesson vocab.

#### Plan (HOW)

**SM-2 Algorithm**:
```
again: interval = 1; ef -= 0.2
hard:  interval *= 1.2; ef -= 0.15
good:  interval *= ef; ef unchanged
easy:  interval *= ef * 1.3; ef += 0.05
clamp(ef, 1.3, 2.5)
dueDate = now + interval days
```

**Component Breakdown**:
- `SRSAlgorithm` (shared-utils): pure SM-2 functions.
- `FlashcardRepository` (SQLite): CRUD + due queries.
- `ReviewSessionEngine` (mobile): manages session state, tracks answers.
- `FlashcardReviewScreen` (RN): swipe/button UI with animations.

**Data Flow**:
```
Lesson completed -> Extract vocab -> Create Flashcards (interval=1, ef=2.5)
Daily 00:00 -> Query due cards -> Present in ReviewScreen -> Update SM-2 state -> Persist
```

#### Tasks

- [ ] Implement SM-2 algorithm with unit tests (est: 6h)
- [ ] Create `flashcards` SQLite schema + repository (est: 4h)
- [ ] Build `FlashcardReviewScreen` with swipe gestures (est: 10h)
- [ ] Implement auto-card creation from lesson vocab (est: 4h)
- [ ] Add daily due notifications (est: 4h)
- [ ] Write SM-2 property-based tests (est: 4h)

---

### MOD-006: Live Conversation Practice

#### Spec (WHAT/WHY)

**Description**: Real-time AI conversation practice. User speaks (STT), AI responds via streaming text generation, and AI speech is played back (TTS). Context-aware dialogue maintained across turns.

**User Stories**:
- US-017: As a user, I want to practice speaking with an AI tutor in my target language.
- US-018: As a user, I want the AI to correct my grammar mistakes during conversation.
- US-019: As a user, I want the conversation to follow a scenario (e.g., ordering coffee).

**Acceptance Criteria**:
- STT latency < 3s end-to-end (speech -> text displayed).
- AI response streams token-by-token with < 1s time-to-first-token.
- Conversation context maintained for up to 20 turns.
- Optional grammar correction delivered gently (not interrupting flow).
- Scenario picker before starting (free chat vs. situational).

#### Plan (HOW)

**Technical Design**:
- **STT**: `expo-speech` (built-in) or `react-native-voice` for cross-platform speech recognition. Fallback: keyboard input.
- **AI Model**: For latency, use a smaller dialogue model like `microsoft/DialoGPT-medium` or fine-tuned `flan-t5-small`. Alternatively, use `flan-t5-base` with a conversation prompt template but accept 2-3s latency.
- **Streaming**: FastAPI WebSocket endpoint streams generated tokens via `async for token in model.generate_stream()`.
- **TTS**: `expo-speech` `Speech.speak()` for AI responses in target language.
- **Context**: Maintain last 10 turns in SQLite `conversations` table; send as prompt context.

**Architecture**:
```
Mobile STT --text--> WebSocket /ws/chat
                        |
                        v
              +-----------------+
              |  Conversation   |
              |   Manager       |
              | (context window)|
              +--------+--------+
                       |
                       v
              +-----------------+
              |  DialoGPT /     |
              |  flan-t5-chat   |
              |  (streaming)    |
              +--------+--------+
                       |
                       v
              Mobile <--tokens-- TTS speak
```

**Prompt Template (for flan-t5)**:
```
You are a helpful {targetLang} tutor. The user is learning {targetLang} at level {level}.
Scenario: {scenario}
Conversation so far:
{history}
User said: {userInput}
Respond naturally in {targetLang}. Keep sentences short and level-appropriate.
If the user made a grammar mistake, include a gentle correction in parentheses.
Tutor:
```

**Component Breakdown**:
- `ConversationScreen` (RN): chat UI, mic button, scenario selector.
- `SpeechService` (RN): STT + TTS wrapper.
- `ChatWebSocketClient` (RN): manages WS connection, reconnection.
- `ConversationEngine` (Python): context assembly, streaming generation.
- `ScenarioManager`: static scenarios by theme.

**Risks & Mitigations**:
- *Risk*: WebSocket drops on mobile networks. *Mitigation*: Auto-reconnect with exponential backoff; queue messages.
- *Risk*: Model too slow for real-time feel. *Mitigation*: Use smaller model for chat; pre-warm model in GPU memory; implement typing indicator.
- *Risk*: STT accuracy for language learners (accented speech). *Mitigation*: Allow manual text edit before sending; support keyboard-only mode.

#### Tasks

- [ ] Research & integrate `expo-speech` STT + TTS (est: 6h)
- [ ] Build `ConversationScreen` chat UI (est: 10h)
- [ ] Implement WebSocket server in ML service (est: 6h)
- [ ] Integrate dialogue model (`DialoGPT-medium` or `flan-t5-small`) (est: 8h)
- [ ] Implement context window management (est: 6h)
- [ ] Add scenario picker + static scenarios (est: 6h)
- [ ] Implement grammar correction layer (est: 6h)
- [ ] Add connection resilience + retry logic (est: 4h)
- [ ] Write E2E conversation tests (est: 6h)

---

### MOD-007: Progress Tracking & Analytics

#### Spec (WHAT/WHY)

**Description**: Dashboard showing learning stats, streaks, XP, skill mastery percentages, and roadmap completion. Visualized with charts.

**User Stories**:
- US-020: As a user, I want to see my daily streak to stay motivated.
- US-021: As a user, I want to know my vocabulary mastery percentage.
- US-022: As a user, I want to see a chart of my learning time over the past month.

**Acceptance Criteria**:
- Stats computed from local SQLite (no backend required).
- XP formula: base XP for lesson completion + bonus for streak + bonus for perfect quiz.
- Mastery % = (cards with interval >= 21 days) / total cards.
- Charts render offline using `react-native-svg` or `victory-native`.

#### Plan (HOW)

**Data Model**:
- `progress_logs`: daily aggregations (minutes, lessons, cards reviewed, accuracy).
- `skill_mastery`: per-skill percentages updated after each activity.

**Component Breakdown**:
- `ProgressDashboard` (RN): scrollable dashboard.
- `StatsEngine` (shared-utils): pure functions computing XP, mastery, streaks.
- `ChartComponents` (RN): line chart (activity), circular progress (mastery).

**Dependencies**: MOD-005 (flashcard data), MOD-003 (lesson completion data)

#### Tasks

- [ ] Design `progress_logs` + `skill_mastery` schema (est: 3h)
- [ ] Implement `StatsEngine` with unit tests (est: 6h)
- [ ] Build `ProgressDashboard` with charts (est: 10h)
- [ ] Add XP + streak calculation (est: 4h)
- [ ] Implement weekly/monthly time charts (est: 6h)

---

### MOD-008: Offline Sync & Backup

#### Spec (WHAT/WHY)

**Description**: Optional encrypted cloud backup of local SQLite data to Express backend. Supports multi-device restore.

**User Stories**:
- US-023: As a user, I want to back up my progress so I don't lose it if I change phones.
- US-024: As a user, I want my data encrypted before leaving my device.

**Acceptance Criteria**:
- Sync triggered manually or on WiFi + charging.
- Data encrypted with AES-256-GCM using a user-derived key (PBKDF2).
- Backend stores encrypted blob; cannot read content.
- Restore downloads blob, decrypts, replaces local SQLite.

#### Plan (HOW)

**Encryption Flow**:
1. User sets passphrase -> PBKDF2 derives key.
2. Local SQLite dumped to JSON -> encrypted -> POST `/backup`.
3. Restore: GET `/backup` -> decrypt -> validate schema -> write SQLite.

**Component Breakdown**:
- `SyncManager` (RN): detects connection, queues sync jobs.
- `EncryptionService` (RN): `react-native-aes-crypto` or Web Crypto API.
- `BackupService` (backend): blob storage (S3-compatible or local filesystem).

#### Tasks

- [ ] Implement SQLite -> JSON dump/restore (est: 4h)
- [ ] Add AES encryption layer (est: 6h)
- [ ] Build `POST /backup` + `GET /backup` endpoints (est: 4h)
- [ ] Create `SyncManager` with queue (est: 6h)
- [ ] Add conflict resolution (server vs. local timestamp) (est: 4h)

---

### MOD-009: Adaptive Learning Engine

#### Spec (WHAT/WHY)

**Description**: Detects if user is ahead/behind schedule, adjusts roadmap difficulty, and recomputes future lessons based on performance.

**User Stories**:
- US-025: As a system, I want to reduce new vocab if the user is falling behind.
- US-026: As a system, I want to add bonus lessons if the user is ahead.
- US-027: As a user, I want to mark "too easy/hard" so future lessons adapt.

**Acceptance Criteria**:
- Ahead detection: completed > 1.5x expected days in a week.
- Behind detection: completed < 0.5x expected days.
- Difficulty tweak: vocab complexity, sentence length, grammar depth adjusted.
- User "too easy/hard" feedback updates internal difficulty parameter.

#### Plan (HOW)

**Algorithm**:
```
expectedDays = days since start
actualDays = count(completed lessons)
ratio = actualDays / expectedDays

if ratio > 1.5: status = AHEAD -> generate bonus mini-lessons, increase difficulty +1
if ratio < 0.5: status = BEHIND -> compress roadmap (merge 2 days into 1), reduce new vocab by 30%
else: status = ON_TRACK

User feedback "too easy": difficulty -= 1
User feedback "too hard": difficulty += 1
```

**Component Breakdown**:
- `AdaptiveEngine` (backend): analyzes progress, adjusts parameters.
- `RoadmapCompressor`: merges low-priority days.
- `DifficultyAdjuster`: tweaks prompt parameters sent to LLM.

#### Tasks

- [ ] Implement ahead/behind detection (est: 4h)
- [ ] Build roadmap compressor (est: 6h)
- [ ] Add difficulty parameter to lesson prompts (est: 4h)
- [ ] Create user feedback handlers (est: 3h)
- [ ] Add periodic mastery check quizzes (est: 4h)

---

### MOD-010: Content Fallback & Quality Control

#### Spec (WHAT/WHY)

**Description**: Ensures the app works when LLM fails, is offline, or generates poor content. Provides templated lessons, static phrasebooks, and user flagging.

**User Stories**:
- US-028: As a user, I want lessons even when the AI is unavailable.
- US-029: As a user, I want to flag incorrect translations so they can be fixed.

**Acceptance Criteria**:
- Offline lesson library: 30 days of templated lessons per goal x level.
- Flagged content sent to backend for review queue.
- Fallback triggered automatically after 2 LLM failures.

#### Plan (HOW)

**Component Breakdown**:
- `FallbackLibrary` (JSON assets): templated lessons.
- `ContentFlagService`: stores flags in SQLite, syncs to backend.
- `QualityGate`: validates LLM output before showing to user.

#### Tasks

- [ ] Generate 30-day templated lesson library (est: 12h)
- [ ] Implement automatic fallback on LLM failure (est: 4h)
- [ ] Add flag content UI + backend queue (est: 6h)
- [ ] Build quality gate (est: 4h)

---

## 5. Data Model Specification

### SQLite Schema (Mobile, Primary)

```sql
-- UserPlan
CREATE TABLE user_plans (
  id TEXT PRIMARY KEY,
  goal TEXT NOT NULL,
  current_level TEXT NOT NULL,
  target_level TEXT NOT NULL,
  weeks INTEGER NOT NULL,
  daily_minutes INTEGER NOT NULL,
  interests TEXT, -- JSON array
  target_language TEXT NOT NULL,
  native_language TEXT NOT NULL DEFAULT 'en',
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  paused INTEGER NOT NULL DEFAULT 0
);

-- Roadmap (stored as JSON blob for flexibility)
CREATE TABLE roadmaps (
  id TEXT PRIMARY KEY,
  user_plan_id TEXT NOT NULL REFERENCES user_plans(id),
  content TEXT NOT NULL, -- JSON: { weeks: Week[] }
  version INTEGER NOT NULL DEFAULT 1,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

-- Lesson
CREATE TABLE lessons (
  id TEXT PRIMARY KEY,
  user_plan_id TEXT NOT NULL,
  day INTEGER NOT NULL,
  theme TEXT NOT NULL,
  level TEXT NOT NULL,
  vocab TEXT NOT NULL, -- JSON
  dialogues TEXT NOT NULL, -- JSON
  grammar_note TEXT,
  quiz TEXT NOT NULL, -- JSON
  generated_at INTEGER NOT NULL,
  is_fallback INTEGER NOT NULL DEFAULT 0
);

-- Flashcard (SM-2)
CREATE TABLE flashcards (
  id TEXT PRIMARY KEY,
  user_plan_id TEXT NOT NULL,
  front TEXT NOT NULL,
  back TEXT NOT NULL,
  due_date INTEGER NOT NULL,
  interval_days REAL NOT NULL DEFAULT 1,
  ease_factor REAL NOT NULL DEFAULT 2.5,
  review_count INTEGER NOT NULL DEFAULT 0,
  last_review INTEGER,
  streak INTEGER NOT NULL DEFAULT 0,
  source_lesson_id TEXT,
  created_at INTEGER NOT NULL
);

-- Progress Logs
CREATE TABLE progress_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  date TEXT NOT NULL UNIQUE, -- YYYY-MM-DD
  minutes_active INTEGER NOT NULL DEFAULT 0,
  lessons_completed INTEGER NOT NULL DEFAULT 0,
  cards_reviewed INTEGER NOT NULL DEFAULT 0,
  cards_correct INTEGER NOT NULL DEFAULT 0,
  xp_earned INTEGER NOT NULL DEFAULT 0
);

-- Conversations
CREATE TABLE conversations (
  id TEXT PRIMARY KEY,
  user_plan_id TEXT NOT NULL,
  scenario TEXT,
  started_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE conversation_turns (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  conversation_id TEXT NOT NULL,
  role TEXT NOT NULL, -- 'user' | 'assistant'
  text TEXT NOT NULL,
  grammar_correction TEXT,
  created_at INTEGER NOT NULL
);

-- Translation Cache
CREATE TABLE translations_cache (
  id TEXT PRIMARY KEY,
  source_text TEXT NOT NULL,
  source_lang TEXT NOT NULL,
  target_lang TEXT NOT NULL,
  translated_text TEXT NOT NULL,
  created_at INTEGER NOT NULL
);

-- Settings
CREATE TABLE settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
```

### PostgreSQL Schema (Backend Sync)

Identical schema plus:

```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  anonymous_uuid UUID UNIQUE NOT NULL,
  email TEXT UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE encrypted_backups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  encrypted_blob BYTEA NOT NULL,
  salt BYTEA NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

---

## 6. API & WebSocket Contracts

### REST Endpoints

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| POST | `/plan` | Create plan + generate roadmap | Anonymous UUID |
| GET | `/plan` | Get current plan | UUID |
| PUT | `/plan` | Update plan + recompute | UUID |
| GET | `/roadmap` | Get full roadmap | UUID |
| GET | `/roadmap/day/:day` | Day detail + lesson + due cards | UUID |
| POST | `/lesson/generate` | Generate lesson for day | UUID |
| POST | `/flashcards/review` | Submit review result | UUID |
| GET | `/flashcards/due` | List due cards today | UUID |
| GET | `/progress` | Aggregated stats | UUID |
| POST | `/translate` | Translate text | UUID |
| POST | `/backup` | Upload encrypted backup | UUID |
| GET | `/backup` | Download encrypted backup | UUID |

### Request/Response Examples

**POST /plan**

```json
{
  "goal": "travel",
  "currentLevel": "A1",
  "targetLevel": "B1",
  "weeks": 4,
  "dailyMinutes": 20,
  "interests": ["food", "transport"],
  "targetLanguage": "es",
  "nativeLanguage": "en"
}
```

**Response:**

```json
{
  "planId": "uuid",
  "roadmap": {
    "weeks": [
      {
        "weekNumber": 1,
        "theme": "Greetings & Basics",
        "objectives": ["Introduce yourself", "Ask someone's name"],
        "dailyTargets": [ "..." ]
      }
    ]
  }
}
```

**POST /flashcards/review**

```json
{
  "cardId": "uuid",
  "performance": "good"
}
```

**Response:**

```json
{
  "cardId": "uuid",
  "nextDueDate": "2026-04-28T00:00:00Z",
  "intervalDays": 2.5,
  "easeFactor": 2.5,
  "streak": 3
}
```

### WebSocket Contract

**Endpoint**: `ws://ml-service:8000/ws/conversation`

**Message Types**:
- Client -> Server: `{"type": "start", "scenario": "ordering_coffee", "level": "A1", "targetLang": "es"}`
- Client -> Server: `{"type": "message", "text": "Quiero un cafe", "conversationId": "uuid"}`
- Server -> Client: `{"type": "token", "text": "Claro", "conversationId": "uuid"}` (streaming)
- Server -> Client: `{"type": "done", "grammarCorrection": "Remember: 'quiero' is correct!", "conversationId": "uuid"}`

---

## 7. Frontend Architecture

### Navigation Structure (Expo Router)

```
app/
├── (tabs)/
│   ├── index.tsx          # Today / Dashboard
│   ├── learn.tsx          # Roadmap / Calendar
│   ├── translate.tsx      # Translation
│   ├── converse.tsx       # Live Conversation
│   └── progress.tsx       # Stats / Profile
├── onboarding/
│   ├── step-[1-5].tsx
│   └── review.tsx
├── lesson/
│   └── [day].tsx
├── review/
│   └── index.tsx
├── settings/
│   └── index.tsx
└── _layout.tsx
```

### State Management

**Zustand Stores**:
- `usePlanStore`: current plan, roadmap metadata.
- `useLessonStore`: generated lessons, caching.
- `useSRSStore`: flashcards, due counts, review session.
- `useProgressStore`: XP, streak, logs.
- `useSettingsStore`: language, notifications, sync preferences.

### Key UI Components

- `RoadmapCalendar`: Weekly grid with completion dots.
- `LessonCard`: Swipeable vocab cards with audio playback.
- `QuizWidget`: Interactive MCQ with immediate feedback.
- `FlashcardDeck`: Swipe gestures (again/hard/good/easy).
- `ChatBubble`: Conversation UI with typing indicators.
- `ProgressRing`: Circular mastery indicator.

---

## 8. AI/ML Pipeline & Infrastructure

### Local Model Serving Architecture

```
+---------------------------------------------+
|              Docker Compose                  |
|  +--------------+    +--------------+       |
|  |  ML Service  |<-->|    Redis     |       |
|  |  (FastAPI)   |    |   (Cache)    |       |
|  +------+-------+    +--------------+       |
|         |                                    |
|  +------v-------+                           |
|  |  Model Volume|  /models (cached HF files)|
|  |  (Bind mount)|                           |
|  +--------------+                           |
+---------------------------------------------+
```

### Model Configuration

| Purpose | Model | Size | Quantization | Latency Target |
|---------|-------|------|--------------|----------------|
| Lesson Generation & Translation | `google/flan-t5-base` | 250M | ONNX int8 / FP16 | < 15s |
| Conversation | `microsoft/DialoGPT-medium` | 345M | ONNX FP16 | < 2s TTF |
| Fallback Chat | `google/flan-t5-small` | 77M | int8 | < 1s TTF |

**Optimization Stack**:
- **ONNX Runtime**: Export models via `optimum-cli export onnx` for 2-3x inference speed.
- **Quantization**: `bitsandbytes` 8-bit for GPU; `onnxruntime` dynamic quantization for CPU.
- **Streaming**: Use `transformers` `TextIteratorStreamer` with FastAPI `StreamingResponse`.
- **Batching**: Group identical prompts (e.g., same theme/level) for parallel generation.

### Infrastructure Specs (Self-Hosting)

**Minimum (CPU-Only)**:
- 2 vCPU, 4GB RAM
- 10GB disk (model cache)
- Docker + Docker Compose

**Recommended (GPU)**:
- NVIDIA GPU with 4GB+ VRAM (GTX 1650 / T4)
- CUDA 11.8+ drivers
- 4 vCPU, 8GB RAM
- 20GB SSD

**Deployment Options**:
1. **Local Dev**: `docker-compose up` on developer machine.
2. **Home Server**: Raspberry Pi 5 (8GB) with `flan-t5-small` only; larger models on NAS.
3. **Cloud VM**: RunPod / Vast.ai GPU instances for heavy users.
4. **Hybrid**: Mobile app calls HuggingFace Inference API as primary, falls back to local Docker if API quota exhausted.

### Prompt Versioning

Store prompts in `apps/ml-service/prompts/{version}/` with git tracking. A/B test via `prompt_version` parameter.

---

## 9. Security & Privacy

### Threat Model

| Threat | Mitigation |
|--------|------------|
| Backup data intercepted | AES-256-GCM encryption client-side; server stores opaque blob |
| LLM prompt injection | Strict input validation; regex output constraints |
| Local SQLite tampering | Integrity check on startup (optional HMAC) |
| API abuse (backend) | Rate limiting per UUID; no PII in logs |
| Model serving exposed | Bind to localhost only; no public ingress |

### Privacy Principles

- No email required. Anonymous UUID generated on first launch.
- Target/native languages + interests are the only "personal" data.
- Optional account creation only for multi-device sync.

---

## 10. Testing & Quality Assurance

### Unit Tests

- **SM-2 Algorithm**: Property-based tests (fast-check) verifying interval monotonicity, EF clamping.
- **Roadmap Validator**: Fuzz JSON inputs against Zod schema.
- **Stats Engine**: Deterministic XP/streak calculations.

### Integration Tests

- **Full Flow**: Onboarding -> Day 1 Lesson -> Quiz -> Flashcard Review -> Progress Check.
- **Offline Flow**: Airplane mode -> lesson from cache -> flashcard review -> sync on reconnect.

### E2E Tests (Maestro / Detox)

- Onboarding completion flow.
- Daily lesson navigation and quiz completion.
- Flashcard review with all 4 ratings.
- Live conversation WebSocket connection.

### Backend Tests

- API contract validation (supertest + jest).
- LLM service load testing (locust): 10 concurrent users, < 5s p95 latency.

---

## 11. 12-Week Implementation Roadmap

| Week | Focus | Key Deliverables |
|------|-------|------------------|
| **1** | Constitution & Scaffolding | Monorepo setup, Docker Compose, shared packages, SQLite schema, backend scaffolding |
| **2** | Onboarding & Plan API | Onboarding screens, `POST /plan`, `GET /plan`, Zod schemas, basic roadmap templates |
| **3** | Roadmap Generator | `RoadmapService`, static templates, LLM integration, calendar UI |
| **4** | Lesson Generator | ML service scaffold, `flan-t5-base` pipeline, `POST /lesson/generate`, `LessonScreen` |
| **5** | Flashcards & SRS | SM-2 implementation, `flashcards` table, review UI, due notifications |
| **6** | Translation Service | Local LLM translation endpoint, SQLite caching, offline phrasebook, `TranslateScreen` |
| **7** | Live Conversation | STT/TTS integration, WebSocket chat, dialogue model, `ConversationScreen` |
| **8** | Progress & Adaptation | Dashboard charts, adaptive engine, ahead/behind detection, difficulty tweaks |
| **9** | Offline Sync | Backup encryption, sync manager, conflict resolution, `POST /backup` |
| **10** | Fallbacks & Polish | 30-day templated library, error boundaries, loading states, deep links |
| **11** | Testing | Unit test coverage > 80%, integration tests, E2E flows, bug fixes |
| **12** | Performance & Beta | ONNX optimization, bundle size audit, beta build, app store prep |

---

## 12. Open Decisions & Risks

| Decision | Options | Recommendation |
|----------|---------|----------------|
| **LLM for Conversations** | `DialoGPT` vs. `flan-t5` vs. `Gemma-2B-IT` | Start with `flan-t5-base` for lessons; use `DialoGPT-medium` for chat. Evaluate `Gemma-2B` for quality. |
| **Roadmap Recompute** | Full vs. Incremental | Incremental (future weeks only) to preserve history. |
| **Difficulty Model** | Rule-based vs. ML predictor | Rule-based thresholds for MVP; ML predictor post-launch with enough data. |
| **Goal Switching** | Reset vs. Migrate | Migrate: map completed objectives to new goal; archive non-matching progress. |
| **Model Hosting** | Local Docker vs. Cloud API | Design for local Docker; allow cloud API override via settings. |

---

## Next Steps

Once you approve this design, the recommended scaffolding order is:

1. Initialize monorepo (`apps/`, `packages/`, `infra/docker/`).
2. Set up `.specify/` templates and Speckit workflow.
3. Implement `packages/shared-types` with all Zod schemas.
4. Scaffold `apps/backend` and `apps/ml-service` with Docker Compose.
5. Build `apps/mobile` with Expo Router and the tab structure.

> **Note**: This document is a living spec. Update it as decisions are made and architecture evolves.
