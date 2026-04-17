export function normalizeSportType(value: unknown) {
  const raw = String(value || "cross").trim().toLowerCase();
  return raw === "running" || raw === "strength" ? raw : "cross";
}
