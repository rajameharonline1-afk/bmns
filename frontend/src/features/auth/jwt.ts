const parseBase64 = (value: string) => {
  try {
    return JSON.parse(atob(value.replace(/-/g, "+").replace(/_/g, "/")));
  } catch {
    return null;
  }
};

export const getTokenExpiry = (token: string | null): number | null => {
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const payload = parseBase64(parts[1]);
  if (!payload || typeof payload.exp !== "number") return null;
  return payload.exp * 1000;
};
