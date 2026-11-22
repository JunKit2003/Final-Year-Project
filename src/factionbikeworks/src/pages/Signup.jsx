import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router";
import api from "../lib/api";
import { useToast } from "../lib/store";
import AuthShell, { Field } from "../components/AuthShell";
import { Arrow } from "../components/ui/Icons";

const strength = (pw) => {
  let s = 0;
  if (pw.length >= 8) s++;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) s++;
  if (/\d/.test(pw)) s++;
  if (/[^A-Za-z0-9]/.test(pw)) s++;
  return s;
};

export default function Signup() {
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ first_name: "", last_name: "", username: "", email: "", phone_number: "", password: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const score = strength(form.password);

  const set = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      // The server always creates customers; no role is sent from here.
      const res = await api.post("/api/account/signup", form);
      if (!res.data?.user) throw new Error("no-user");
      toast("Account created. Sign in to start shopping.");
      navigate("/login", { state: location.state });
    } catch (err) {
      const data = err.response?.data;
      setError(data?.errors ? data.errors.join(", ") : data?.message || (err.response ? "Sign up failed." : "Can't reach the server."));
      setBusy(false);
    }
  };

  return (
    <AuthShell page="signup">
      <div>
        <h2 className="h2">Create account</h2>
        <p className="muted auth-sub">
          Already riding with us?{" "}
          <Link to="/login" className="link accent" state={location.state}>
            Sign in
          </Link>
        </p>
      </div>
      <form onSubmit={submit} className="auth-fields">
        {error && (
          <div className="alert alert-error" role="alert">
            {error}
          </div>
        )}
        <div className="form-grid">
          <Field id="first_name" label="First name" value={form.first_name} onChange={set} auto="given-name" />
          <Field id="last_name" label="Last name" value={form.last_name} onChange={set} auto="family-name" />
        </div>
        <Field id="username" label="Username" value={form.username} onChange={set} auto="username" />
        <Field id="email" label="Email" type="email" value={form.email} onChange={set} auto="email" />
        <Field id="phone_number" label="Phone number" type="tel" value={form.phone_number} onChange={set} auto="tel" />
        <Field id="password" label="Password" type="password" value={form.password} onChange={set} auto="new-password">
          <div className={`pw-meter s-${score}`} aria-hidden>
            <span />
            <span />
            <span />
            <span />
          </div>
        </Field>
        <button type="submit" className="btn btn-primary btn-block" disabled={busy}>
          {busy ? "Creating…" : "Create account"} {!busy && <Arrow />}
        </button>
      </form>
    </AuthShell>
  );
}
