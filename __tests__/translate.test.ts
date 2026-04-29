import { interpolateTemplate, translatePath } from "../src/i18n/translate";

import es from "../data/locales/es.json";

describe("translate helpers", () => {
  it("resolves nested translation paths", () => {
    expect(translatePath(es, "app.titleMain")).toBe("Traducción en vivo");
    expect(translatePath(es, "missing.key")).toBe("missing.key");
  });

  it("interpolates template variables", () => {
    expect(
      interpolateTemplate("{{label}}, ok", { label: "ES" })
    ).toBe("ES, ok");
  });
});
