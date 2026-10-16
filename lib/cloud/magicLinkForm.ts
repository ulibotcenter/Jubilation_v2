export const ACCOUNT_PASSWORD_MIN = 10;

export function isValidAccountEmail(email: string): boolean {
  return email.trim().includes("@");
}

export function passwordMeetsAccountMinimum(password: string): boolean {
  return password.length >= ACCOUNT_PASSWORD_MIN;
}

/** Magic-link payload: email is required; age/country are optional extras. */
export function magicLinkRequestBody(input: {
  email: string;
  age: string;
  country: string;
}): { email: string; age?: number; country?: string } | null {
  const email = input.email.trim();
  if (!isValidAccountEmail(email)) return null;
  const age = Number(input.age);
  if (
    Number.isInteger(age) &&
    age >= 18 &&
    age <= 120 &&
    input.country.trim().length > 0
  ) {
    return { email, age, country: input.country };
  }
  return { email };
}
