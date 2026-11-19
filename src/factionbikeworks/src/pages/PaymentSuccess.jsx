import { useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router";
import api from "../lib/api";
import { useSession } from "../lib/store";
import { Loader } from "../components/ui/Bits";
import { Arrow, Check, Close } from "../components/ui/Icons";

export function ResultCard({ tone, kicker, title, children, actions }) {
  return (
    <div className="page result topo">
      <div className={`result-card result-card--${tone}`}>
        <div className="result-icon">{tone === "ok" ? <Check /> : <Close />}</div>
        <p className="kicker">{kicker}</p>
        <h1 className="h2">{title}</h1>
        <p className="lead">{children}</p>
        <div className="result-actions">{actions}</div>
      </div>
    </div>
  );
}

export default function PaymentSuccess() {
  const { user, checking, refreshCart } = useSession();
  const [params] = useSearchParams();
  const [result, setState] = useState(null);
  const done = useRef(false); // StrictMode runs effects twice; finalise once.
  const sessionId = params.get("session_id");

  // Cases with nothing to verify are derived, not set from an effect.
  const state = checking
    ? { loading: true }
    : !user
      ? { loading: false, ok: false, message: "Sign in again to confirm your payment. If you were charged, your order is safe." }
      : !sessionId
        ? { loading: false, ok: false, message: "No payment session in the link, so we couldn't verify the payment." }
        : result || { loading: true };

  useEffect(() => {
    if (checking || done.current || !user || !sessionId) return;
    done.current = true;
    api
      .patch("/api/cart/markOrderPaidAndClearCart", { session_id: sessionId, user_id: user.id })
      .then(() => {
        setState({ loading: false, ok: true, message: "Payment received. Your order is confirmed and the items are out of your cart. We'll be in touch about delivery." });
        refreshCart(user);
      })
      .catch((e) => setState({ loading: false, ok: false, message: e.response?.data?.message || "We couldn't confirm the payment. If you were charged, WhatsApp us with your order details." }));
  }, [checking, user, sessionId, refreshCart]);

  if (state.loading) return <Loader label="Confirming your payment" />;

  return state.ok ? (
    <ResultCard
      tone="ok"
      kicker="Payment successful"
      title="Order locked in"
      actions={
        <>
          <Link to="/orderHistory" className="btn btn-primary">
            View my orders <Arrow />
          </Link>
          <Link to="/catalog" className="btn btn-ghost">
            Keep shopping
          </Link>
        </>
      }
    >
      {state.message}
    </ResultCard>
  ) : (
    <ResultCard
      tone="error"
      kicker="Payment check"
      title="Hmm, not confirmed"
      actions={
        <Link to="/orderHistory" className="btn btn-primary">
          Check my orders
        </Link>
      }
    >
      {state.message}
    </ResultCard>
  );
}
