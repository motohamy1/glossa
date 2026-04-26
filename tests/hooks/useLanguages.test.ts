import { renderHook, act, waitFor } from '@testing-library/react-native';
import { useLanguages, clearLanguageCache } from '../../hooks/useLanguages';

const STATIC_LIST = [
  'English', 'Spanish', 'French', 'German',
  'Italian', 'Portuguese', 'Russian', 'Chinese',
  'Japanese', 'Korean', 'Arabic', 'Hindi',
  'Turkish', 'Dutch', 'Polish', 'Swedish',
];

const originalFetch = global.fetch;

function mockFetch(response: unknown, ok = true, status = 200) {
  (global.fetch as jest.Mock).mockResolvedValueOnce({
    ok,
    status,
    json: async () => response,
  });
}

function mockFetchError() {
  (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));
}

beforeEach(() => {
  global.fetch = jest.fn();
  clearLanguageCache();
});

afterAll(() => {
  global.fetch = originalFetch;
});

describe('useLanguages', () => {
  it('returns loading state initially', () => {
    mockFetch({ languages: [] });
    const { result } = renderHook(() => useLanguages('http://localhost:8000'));
    expect(result.current.fetchState).toBe('loading');
  });

  it('fetches languages and returns loaded state on success', async () => {
    mockFetch({ languages: ['english', 'spanish', 'french'] });

    const { result } = renderHook(() => useLanguages('http://localhost:8000'));

    await waitFor(() => {
      expect(result.current.fetchState).toBe('loaded');
    });

    expect(result.current.languages).toEqual(['English', 'Spanish', 'French']);
    expect(result.current.source).toBe('api');
  });

  it('normalizes language names to Title Case', async () => {
    mockFetch({ languages: ['english', 'chinese', 'korean'] });

    const { result } = renderHook(() => useLanguages('http://localhost:8000'));

    await waitFor(() => {
      expect(result.current.fetchState).toBe('loaded');
    });

    expect(result.current.languages).toEqual(['English', 'Chinese', 'Korean']);
  });

  it('falls back to static list on network error', async () => {
    mockFetchError();

    const { result } = renderHook(() => useLanguages('http://localhost:8000'));

    await waitFor(() => {
      expect(result.current.fetchState).toBe('error');
    });

    expect(result.current.languages).toEqual(STATIC_LIST);
    expect(result.current.source).toBe('static');
  });

  it('falls back to static list on non-ok response', async () => {
    mockFetch({ languages: [] }, false, 500);

    const { result } = renderHook(() => useLanguages('http://localhost:8000'));

    await waitFor(() => {
      expect(result.current.fetchState).toBe('error');
    });

    expect(result.current.languages).toEqual(STATIC_LIST);
    expect(result.current.source).toBe('static');
  });

  it('falls back to static list when API returns empty array', async () => {
    mockFetch({ languages: [] });

    const { result } = renderHook(() => useLanguages('http://localhost:8000'));

    await waitFor(() => {
      expect(result.current.fetchState).toBe('loaded');
    });

    expect(result.current.languages).toEqual(STATIC_LIST);
    expect(result.current.source).toBe('static');
  });

  it('falls back to static list when API returns null languages', async () => {
    mockFetch({ languages: null });

    const { result } = renderHook(() => useLanguages('http://localhost:8000'));

    await waitFor(() => {
      expect(result.current.fetchState).toBe('loaded');
    });

    expect(result.current.languages).toEqual(STATIC_LIST);
    expect(result.current.source).toBe('static');
  });

  it('allows manual refetch', async () => {
    mockFetch({ languages: ['english'] });

    const { result } = renderHook(() => useLanguages('http://localhost:8000'));

    await waitFor(() => {
      expect(result.current.fetchState).toBe('loaded');
    });
    expect(result.current.languages).toEqual(['English']);

    mockFetch({ languages: ['spanish', 'french'] });

    await act(async () => {
      result.current.refetch();
    });

    await waitFor(() => {
      expect(result.current.languages).toEqual(['Spanish', 'French']);
    });
  });
});
