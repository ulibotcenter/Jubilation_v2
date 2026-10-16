import { afterEach, describe, expect, it, vi } from "vitest";
import { cloudAuthConfig, DEFAULT_RESEND_FROM } from "@/lib/cloud/config";
import {
  deliverMagicLinkEmail,
  RESEND_FALLBACK_FROM,
} from "@/lib/cloud/mail";

const AUTH_ENV = {
  DATABASE_URL: "postgres://u:p@db.eu/jubilation",
  AUTH_SECRET: "a-very-long-auth-secret",
  RESEND_API_KEY: "re_test_key",
};

const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
  vi.restoreAllMocks();
});

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("resend magic-link transport", () => {
  it("defaults From to noreply@jubilation.life when EMAIL_FROM is empty", () => {
    const cfg = cloudAuthConfig(AUTH_ENV);
    expect(cfg.magicLink).toBe(true);
    expect(cfg.emailFrom).toBe(DEFAULT_RESEND_FROM);
    expect(cfg.resendApiKey).toBe("re_test_key");
  });

  it("sends through Resend and does not require SMTP", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse(200, { id: "email_test_1" })
    );
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    const delivered = await deliverMagicLinkEmail(
      { to: "ada@example.com", url: "https://app.example/api/auth/callback?token=x" },
      AUTH_ENV
    );

    expect(delivered).toEqual({
      id: "email_test_1",
      from: DEFAULT_RESEND_FROM,
      transport: "resend",
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://api.resend.com/emails");
    expect(init.method).toBe("POST");
    const headers = init.headers as Record<string, string>;
    expect(headers.Authorization).toBe("Bearer re_test_key");
    const payload = JSON.parse(String(init.body)) as { from: string; to: string[] };
    expect(payload.from).toBe(DEFAULT_RESEND_FROM);
    expect(payload.to).toEqual(["ada@example.com"]);
  });

  it("falls back to onboarding@resend.dev when the domain is unverified", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        jsonResponse(403, {
          name: "validation_error",
          message:
            "The jubilation.life domain is not verified. Please, add and verify your domain on https://resend.com/domains",
        })
      )
      .mockResolvedValueOnce(jsonResponse(200, { id: "email_fallback_1" }));
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    const delivered = await deliverMagicLinkEmail(
      { to: "ada@example.com", url: "https://app.example/api/auth/callback?token=x" },
      AUTH_ENV
    );

    expect(delivered).toEqual({
      id: "email_fallback_1",
      from: RESEND_FALLBACK_FROM,
      transport: "resend",
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    const second = JSON.parse(
      String((fetchMock.mock.calls[1] as [string, RequestInit])[1].body)
    ) as { from: string };
    expect(second.from).toBe(RESEND_FALLBACK_FROM);
  });
});
