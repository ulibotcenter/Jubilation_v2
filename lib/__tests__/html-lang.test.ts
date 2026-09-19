import { describe, expect, it } from "vitest";
import { htmlLang } from "@/lib/i18n/htmlLang";
import { DEFAULT_LOCALE } from "@/types";

describe("html lang", () => {
  it("maps the product default locale to pt-BR", () => {
    expect(DEFAULT_LOCALE).toBe("pt");
    expect(htmlLang(DEFAULT_LOCALE)).toBe("pt-BR");
  });

  it("keeps en and es as BCP 47 tags", () => {
    expect(htmlLang("en")).toBe("en");
    expect(htmlLang("es")).toBe("es");
  });
});
