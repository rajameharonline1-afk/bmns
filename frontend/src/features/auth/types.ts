export type UserRole = "admin" | "manager" | "employee" | "reseller" | "client";

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  role: UserRole;
}
