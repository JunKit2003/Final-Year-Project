import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router";
import { useSession, useToast } from "../lib/store";
import AuthShell, { Field } from "../components/AuthShell";
import { Arrow } from "../components/ui/Icons";

export default function Login() {
  const { login } = useSession();
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ emailOrUsername: "", password: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const from = location.state?.from && location.state.from !== "/login" ? location.state.from : "/";

  const set = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const user = await login(form.emailOrUsername.trim(), form.password);
      if (!user) throw new Error("no-user");
      toast(`Welcome back, ${user.first_name || user.username}.`);
      navigate(user.category === "Admin" && from === "/" ? "/admin" : from, { replace: true });
    } catch (err) {
      setError(err.response?.data?.message || (err.response ? "Sign in failed." : "Can't reach the server. Check your connection."));
      setBusy(false);
    }
  };

  return (
    <AuthShell page="login">
      <div>
        <h2 className="h2">Sign in</h2>
        <p className="muted auth-sub">
          New here?{" "}
          <Link to="/signup" className="link accent" state={location.state}>
            Create an account
          </Link>
        </p>
      </div>
      <form onSubmit={submit} className="auth-fields">
        {error && (
          <div className="alert alert-error" role="alert">
            {error}
          </div>
        )}
        <Field id="emailOrUsername" label="Email or username" value={form.emailOrUsername} onChange={set} auto="username" autoFocus />
        <Field id="password" label="Password" type="password" value={form.password} onChange={set} auto="current-password" />
        <Link to="/PasswordReset" className="link muted auth-forgot">
          Forgot password?
        </Link>
        <button type="submit" className="btn btn-primary btn-block" disabled={busy}>
          {busy ? "Signing in…" : "Sign in"} {!busy && <Arrow />}
        </button>
      </form>
    </AuthShell>
  );
}
