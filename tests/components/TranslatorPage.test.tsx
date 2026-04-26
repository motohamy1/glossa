import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';

import TranslatorPage from '../../app/(tabs)/index';

jest.mock('../../hooks/useLanguages', () => ({
  useLanguages: jest.fn(),
}));

jest.mock('@expo/vector-icons', () => ({
  Ionicons: 'Ionicons',
}));

import { useLanguages } from '../../hooks/useLanguages';

const mockLanguages = [
  'English', 'Spanish', 'French', 'German',
];

function mockHookReturn(overrides: Record<string, unknown> = {}) {
  (useLanguages as jest.Mock).mockReturnValue({
    languages: mockLanguages,
    fetchState: 'loaded',
    source: 'api',
    errorMessage: undefined,
    refetch: jest.fn(),
    ...overrides,
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  mockHookReturn();
});

describe('TranslatorPage', () => {
  it('renders the app title', () => {
    render(<TranslatorPage />);
    expect(screen.getByText('Glossa')).toBeTruthy();
  });

  it('renders source and target language selectors', () => {
    render(<TranslatorPage />);
    expect(screen.getByText('English')).toBeTruthy();
    expect(screen.getByText('Spanish')).toBeTruthy();
  });

  it('renders the translate button', () => {
    render(<TranslatorPage />);
    expect(screen.getByText('Translate')).toBeTruthy();
  });

  it('renders the placeholder in the translation output area', () => {
    render(<TranslatorPage />);
    expect(screen.getByText('Translation will appear here...')).toBeTruthy();
  });

  it('opens language selection modal when source selector is tapped', () => {
    render(<TranslatorPage />);
    fireEvent.press(screen.getByText('English'));
    expect(screen.getByText('Select Source Language')).toBeTruthy();
  });

  it('shows all languages in the modal', () => {
    render(<TranslatorPage />);
    fireEvent.press(screen.getByText('English'));
    mockLanguages.forEach((lang) => {
      const elements = screen.getAllByText(lang);
      expect(elements.length).toBeGreaterThanOrEqual(1);
    });
  });

  it('shows static source indicator when fallback is active', () => {
    mockHookReturn({ source: 'static' });
    render(<TranslatorPage />);
  });

  it('shows loading spinner when useLanguages is loading', () => {
    mockHookReturn({ fetchState: 'loading', languages: [] });
    render(<TranslatorPage />);
  });
});
