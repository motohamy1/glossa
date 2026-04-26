import { useState, useEffect, useCallback, useRef } from 'react';
import type { LanguageResponse, FetchState } from '../types/api';
import { STATIC_LANGUAGES } from '../lib/languages';

const CACHE_TTL_MS = 5 * 60 * 1000;

interface CacheEntry {
  languages: string[];
  fetchedAt: number;
}

let moduleCache: CacheEntry | null = null;

export function clearLanguageCache(): void {
  moduleCache = null;
}

function normalizeLanguageName(name: string): string {
  return name
    .replace(/-/g, ' ')
    .split(' ')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

function validateLanguageList(response: LanguageResponse): boolean {
  return (
    Array.isArray(response.languages) &&
    response.languages.length > 0 &&
    response.languages.every((l) => typeof l === 'string' && l.trim().length > 0)
  );
}

interface UseLanguagesReturn {
  languages: string[];
  fetchState: FetchState;
  source: 'api' | 'static';
  errorMessage?: string;
  refetch: () => void;
}

export function useLanguages(baseUrl: string): UseLanguagesReturn {
  const [languages, setLanguages] = useState<string[]>([]);
  const [fetchState, setFetchState] = useState<FetchState>('loading');
  const [source, setSource] = useState<'api' | 'static'>('static');
  const [errorMessage, setErrorMessage] = useState<string | undefined>();
  const baseUrlRef = useRef(baseUrl);
  baseUrlRef.current = baseUrl;

  const fetchLanguages = useCallback(async (force = false) => {
    if (!force && moduleCache && Date.now() - moduleCache.fetchedAt < CACHE_TTL_MS) {
      setLanguages(moduleCache.languages);
      setFetchState('loaded');
      setSource('api');
      return;
    }

    setFetchState('loading');

    try {
      const response = await fetch(`${baseUrlRef.current}/languages`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data: LanguageResponse = await response.json();

      if (!validateLanguageList(data)) {
        setLanguages([...STATIC_LANGUAGES]);
        setSource('static');
        setFetchState('loaded');
        setErrorMessage('No languages available from server');
        return;
      }

      const normalized = data.languages.map(normalizeLanguageName);

      moduleCache = {
        languages: normalized,
        fetchedAt: Date.now(),
      };

      setLanguages(normalized);
      setSource('api');
      setFetchState('loaded');
      setErrorMessage(undefined);
    } catch {
      const fallback = [...STATIC_LANGUAGES];
      setLanguages(fallback);
      setSource('static');
      setFetchState('error');
      setErrorMessage('Unable to connect to translation service');
    }
  }, []);

  useEffect(() => {
    fetchLanguages(false);
  }, [fetchLanguages]);

  const refetch = useCallback(() => {
    fetchLanguages(true);
  }, [fetchLanguages]);

  return { languages, fetchState, source, errorMessage, refetch };
}
