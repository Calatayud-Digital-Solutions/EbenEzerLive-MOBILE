import React from 'react';
import { render } from '@testing-library/react-native';
import { LanguageSelector } from '../src/components/LanguageSelector';

const mockOnSelectLanguage = jest.fn();

describe('LanguageSelector', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('shows inactive banner when all languages are inactive', () => {
    const activeLangs = { es: false, en: false, ro: false };
    const { getByText } = render(
      <LanguageSelector activeLangs={activeLangs} onSelectLanguage={mockOnSelectLanguage} />
    );
    expect(getByText('No languages available yet')).toBeTruthy();
    expect(getByText(/Translation is only available during the live stream/)).toBeTruthy();
    expect(getByText(/Schedule & contact/)).toBeTruthy();
  });

  it('shows hint when at least one language is active', () => {
    const activeLangs = { es: true, en: false, ro: false };
    const { getByText } = render(
      <LanguageSelector activeLangs={activeLangs} onSelectLanguage={mockOnSelectLanguage} />
    );
    expect(getByText(/Green = live/)).toBeTruthy();
  });

  it('does not show inactive banner when any language is active', () => {
    const activeLangs = { es: true, en: false, ro: false };
    const { queryByText } = render(
      <LanguageSelector activeLangs={activeLangs} onSelectLanguage={mockOnSelectLanguage} />
    );
    expect(queryByText('No languages available yet')).toBeNull();
  });

  it('renders all three language options', () => {
    const activeLangs = { es: false, en: false, ro: false };
    const { getByLabelText } = render(
      <LanguageSelector activeLangs={activeLangs} onSelectLanguage={mockOnSelectLanguage} />
    );
    expect(getByLabelText('Español, unavailable')).toBeTruthy();
    expect(getByLabelText('Inglés, unavailable')).toBeTruthy();
    expect(getByLabelText('Rumano, unavailable')).toBeTruthy();
  });
});
