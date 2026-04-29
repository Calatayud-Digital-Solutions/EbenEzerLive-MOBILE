import React from "react";
import { fireEvent } from "@testing-library/react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { UiLanguageSwitcher } from "../src/components/UiLanguageSwitcher";
import { UI_LOCALE_STORAGE_KEY } from "../src/i18n/uiLocale";

import { renderWithI18n } from "../test/renderWithI18n";

describe("UiLanguageSwitcher", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("switches UI strings and persists locale when selecting English", async () => {
    const { getByText } = renderWithI18n(<UiLanguageSwitcher />);
    fireEvent.press(getByText("EN"));
    expect(AsyncStorage.setItem).toHaveBeenCalledWith(
      UI_LOCALE_STORAGE_KEY,
      "en"
    );
    expect(getByText("Interface language")).toBeTruthy();
  });
});
