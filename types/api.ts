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
