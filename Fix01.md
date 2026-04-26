# Spec-Driven Development: Translation Service & Language Selection

## Phase 1: Specify & Clarify
**Objective**:
1. Verify that the AI model (Argos Translate) in the backend ML service is correctly initialized, running, and capable of translating texts.
2. Update the Expo mobile application to support all languages available in the backend ML service, replacing the hardcoded "English" and "Spanish" with a dynamic language selector.

**Success Criteria**:
- The translation engine is proven to work correctly (verified via a test script or endpoint request).
- The mobile frontend contains a functional UI for selecting `source` and `target` languages from the complete list of supported languages.
- A user can successfully translate text between newly added languages (e.g., English to French) inside the app.

## Phase 2: Plan
1. **Task 1: Verify Translation Service**
   - Check if the Docker container (`ml-service`) is running.
   - Send a test request to the `/ml/translate` endpoint or `/health` to ensure the model loads properly and responds successfully.
2. **Task 2: Expand Language Options in Frontend**
   - Identify the supported languages from `apps/ml-service/main.py` (`LANG_CODES`).
   - Define these languages as constants in the Expo frontend.
3. **Task 3: Update Frontend UI for Language Selection**
   - Modify `app/(tabs)/index.tsx` to include a custom Modal or Picker for language selection.
   - Make the `sourceLang` and `targetLang` Text elements pressable to open this selection modal.
   - Ensure the swap functionality still works correctly with the new state management.
4. **Task 4: End-to-End Testing**
   - Test translation in the UI if possible, or verify the frontend components compile without error.12809779

## Phase 3: Implement
*(Execution of the tasks listed in Phase 2)*
