import React from "react";
import { LanguageSelector } from "../src/components/LanguageSelector";

import { renderWithI18n } from "../test/renderWithI18n";

const mockOnSelectLanguage = jest.fn();

describe("LanguageSelector", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("shows inactive banner when all languages are inactive", () => {
    const activeLangs = { es: false, en: false, ro: false };
    const { getByText } = renderWithI18n(
      <LanguageSelector activeLangs={activeLangs} onSelectLanguage={mockOnSelectLanguage} />
    );
    expect(getByText("Aún no hay idiomas disponibles")).toBeTruthy();
    expect(
      getByText(/La traducción solo está disponible durante la transmisión/)
    ).toBeTruthy();
  });

  it("shows hint when at least one language is active", () => {
    const activeLangs = { es: true, en: false, ro: false };
    const { getByText } = renderWithI18n(
      <LanguageSelector activeLangs={activeLangs} onSelectLanguage={mockOnSelectLanguage} />
    );
    expect(getByText(/Verde = en directo/)).toBeTruthy();
  });

  it("does not show inactive banner when any language is active", () => {
    const activeLangs = { es: true, en: false, ro: false };
    const { queryByText } = renderWithI18n(
      <LanguageSelector activeLangs={activeLangs} onSelectLanguage={mockOnSelectLanguage} />
    );
    expect(queryByText("Aún no hay idiomas disponibles")).toBeNull();
  });

  it("renders all three language options", () => {
    const activeLangs = { es: false, en: false, ro: false };
    const { getByLabelText } = renderWithI18n(
      <LanguageSelector activeLangs={activeLangs} onSelectLanguage={mockOnSelectLanguage} />
    );
    expect(getByLabelText("Español, no disponible")).toBeTruthy();
    expect(getByLabelText("Inglés, no disponible")).toBeTruthy();
    expect(getByLabelText("Rumano, no disponible")).toBeTruthy();
  });
});
