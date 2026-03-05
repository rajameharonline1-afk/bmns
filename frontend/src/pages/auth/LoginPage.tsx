import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../features/auth/AuthProvider";

const LoginPage = () => {
  const navigate = useNavigate();
  const { loginWithPassword, isLoading, error } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    try {
      const profile = await loginWithPassword(username, password);
      navigate(profile.role === "client" ? "/app/client" : "/app/admin");
    } catch {
      // Error handled via auth state.
    }
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_#0f172a,_#020617)] text-white">
      <div className="mx-auto flex min-h-screen max-w-5xl flex-col justify-center px-6">
        <div className="grid gap-12 rounded-3xl border border-white/10 bg-white/5 p-10 lg:grid-cols-[1fr_1fr]">
          <div className="space-y-4">
            <p className="text-xs uppercase tracking-[0.3em] text-cyan-300">Client portal</p>
            <h1 className="text-3xl font-semibold">Sign in to manage your broadband.</h1>
            <p className="text-sm text-slate-300">
              Track invoices, monitor ONU signals, and pay with one tap. Admins can use their internal SSO.
            </p>
            {error ? <p className="text-sm text-rose-300">{error}</p> : null}
          </div>
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div>
              <label className="text-xs uppercase text-slate-400">Username or Email</label>
              <input
                className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-white"
                placeholder="you@isp.com"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                required
              />
            </div>
            <div>
              <label className="text-xs uppercase text-slate-400">Password</label>
              <input
                type="password"
                className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-white"
                placeholder="••••••••"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
              />
            </div>
            <button
              className="w-full rounded-2xl bg-cyan-400 py-3 text-sm font-semibold text-slate-900 disabled:opacity-70"
              type="submit"
              disabled={isLoading}
            >
              {isLoading ? "Signing in..." : "Sign in"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;

