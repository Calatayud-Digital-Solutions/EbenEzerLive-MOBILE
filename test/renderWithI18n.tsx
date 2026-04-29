import React from "react";
import { render, type RenderOptions } from "@testing-library/react-native";

import { I18nProvider } from "../src/i18n/I18nContext";

export function renderWithI18n(
  ui: React.ReactElement,
  options?: Omit<RenderOptions, "wrapper">
) {
  function Wrapper({ children }: { children: React.ReactNode }) {
    return <I18nProvider>{children}</I18nProvider>;
  }
  return render(ui, { wrapper: Wrapper, ...options });
}
