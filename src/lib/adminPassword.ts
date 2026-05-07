export const ADMIN_PASSWORD_STORAGE_KEY = "diskguincho_admin_password_v1";

export function getAdminPasswordFromStorage(): string {
  if (typeof window === "undefined") return "";
  return (window.localStorage.getItem(ADMIN_PASSWORD_STORAGE_KEY) ?? "").trim();
}

export function setAdminPasswordInStorage(pw: string) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(ADMIN_PASSWORD_STORAGE_KEY, pw.trim());
}

export function clearAdminPasswordFromStorage() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(ADMIN_PASSWORD_STORAGE_KEY);
}

