export function getAdminPassword(): string {
  return (process.env.ADMIN_PASSWORD ?? "Escalabahia").trim();
}

export function isAdminPasswordValid(pw: string | null | undefined): boolean {
  if (!pw) return false;
  return pw.trim() === getAdminPassword();
}

