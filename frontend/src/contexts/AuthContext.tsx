import { AuthProvider as BaseProvider, useAuth as useBaseAuth } from "../features/auth/AuthProvider";
import type { UserProfile } from "../features/auth/types";

export const AuthProvider = BaseProvider;

export const useAuth = () => {
  const auth = useBaseAuth();
  const user = auth.user
    ? ({
        ...auth.user,
        fullName: (auth.user as UserProfile).name || auth.user.email || "User",
      } as UserProfile & { fullName: string })
    : null;

  return {
    ...auth,
    user,
  };
};
