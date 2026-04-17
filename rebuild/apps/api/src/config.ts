export const DATABASE_URL = String(process.env.DATABASE_URL || "").trim();
export const JWT_SECRET = String(process.env.JWT_SECRET || "").trim();
export const PORT = Number(process.env.PORT || 8787);
export const DEV_EMAILS = String(process.env.DEV_EMAILS || "")
  .split(",")
  .map((email) => email.trim().toLowerCase())
  .filter(Boolean);

export function assertApiConfig() {
  if (!DATABASE_URL) {
    throw new Error("DATABASE_URL is required for rebuild API");
  }

  if (!JWT_SECRET) {
    throw new Error("JWT_SECRET is required for rebuild API auth compatibility");
  }

  if (!Number.isFinite(PORT) || PORT <= 0) {
    throw new Error("PORT must be a positive number");
  }
}
