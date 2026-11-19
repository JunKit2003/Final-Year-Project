import { useState } from "react";
import { Link, useNavigate } from "react-router";
import api from "../lib/api";
import { useToast } from "../lib/store";
import AuthShell, { Field } from "../components/AuthShell";
import { Arrow, ArrowLeft } from "../components/ui/Icons";

/** Two steps: email -> code sent; code + new password -> reset. */
export default function PasswordReset() {
  const toast = useToast();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const fail = (err, fallback) => {
    setError(err.response?.data?.message || (err.response ? fallback : "Can't reach the server."));
    setBusy(false);
  };

  const requestCode = async (e) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const res = await api.post("/api/account/requestPasswordReset", { email: email.trim() });
      if (!res.data?.success) throw Object.assign(new Error(), { response: { data: res.data } });
      toast("Reset code sent. Check your inbox.");
      setStep(2);
      setBusy(false);
    } catch (err) {
      fail(err, "Couldn't send a reset code.");
    }
  };

  const reset = async (e) => {
    e.preventDefault();
    setError("");
    if (pw !== pw2) {
      setError("Passwords don't match.");
      return;
    }
    setBusy(true);
    try {
      const res = await api.post("/api/account/resetPassword", { email: email.trim(), code: code.trim(), newPassword: pw });
      if (!res.data?.success) throw Object.assign(new Error(), { response: { data: res.data } });
      toast("Password reset. Sign in with your new password.");
      navigate("/login");
    } catch (err) {
      fail(err, "Couldn't reset your password.");
    }
  };

  return (
    <AuthShell kicker="Account recovery" lines={["Reset", "& ride"]} outline={[1]}>
      <div>
        <p className="mono dim steps">Step {step} of 2</p>
        <h2 className="h2">{step === 1 ? "Forgot password" : "Set a new one"}</h2>
        <p className="muted auth-sub">{step === 1 ? "We'll email you a reset code." : `Enter the code we sent to ${email}.`}</p>
      </div>
      {error && (
        <div className="alert alert-error" role="alert">
          {error}
        </div>
      )}
      {step === 1 ? (
        <form onSubmit={requestCode} className="auth-fields">
          <Field id="email" label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} auto="email" autoFocus />
          <button type="submit" className="btn btn-primary btn-block" disabled={busy}>
            {busy ? "Sending…" : "Send reset code"} {!busy && <Arrow />}
          </button>
        </form>
      ) : (
        <form onSubmit={reset} className="auth-fields">
          <Field id="code" label="Reset code" value={code} onChange={(e) => setCode(e.target.value)} auto="one-time-code" inputMode="numeric" autoFocus />
          <Field id="pw" label="New password" type="password" value={pw} onChange={(e) => setPw(e.target.value)} auto="new-password" />
          <Field id="pw2" label="Confirm new password" type="password" value={pw2} onChange={(e) => setPw2(e.target.value)} auto="new-password" />
          <button type="submit" className="btn btn-primary btn-block" disabled={busy}>
            {busy ? "Saving…" : "Reset password"} {!busy && <Arrow />}
          </button>
          <button type="button" className="link muted auth-forgot" onClick={() => setStep(1)}>
            Use a different email
          </button>
        </form>
      )}
      <Link to="/login" className="crumb-back mono">
        <ArrowLeft /> Back to sign in
      </Link>
    </AuthShell>
  );
}
