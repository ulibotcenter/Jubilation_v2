/** Login lives on Settings. Only `/planos` is accepted as a post-login return. */
export const CHECKOUT_LOGIN_HREF = "/settings?next=/planos#cloud-account";

export function safeReturnPath(value: string | null | undefined): string | null {
  if (value === "/planos") return "/planos";
  return null;
}
