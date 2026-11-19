import { useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router";
import api from "../lib/api";
import { useSession } from "../lib/store";
import { Loader } from "../components/ui/Bits";
import { ResultCard } from "./PaymentSuccess";

export default function PaymentFailed() {
  const { user, checking } = useSession();
  const [params] = useSearchParams();
  const [result, setState] = useState(null);
  const done = useRef(false);
  const sessionId = params.get("session_id");
  const state = checking
    ? { loading: true }
    : !user || !sessionId
      ? { loading: false, message: "Checkout was cancelled. You have not been charged." }
      : result || { loading: true };

  useEffect(() => {
    if (checking || done.current || !user || !sessionId) return;
    done.current = true;
    api
      .delete("/api/cart/cancelOrder", { data: { session_id: sessionId, user_id: user.id } })
      .then(() => setState({ loading: false, message: "Checkout was cancelled and the pending order removed. You have not been charged, and your cart is untouched." }))
      .catch((e) => setState({ loading: false, message: `Checkout was cancelled. You have not been charged. ${e.response?.data?.message || ""}`.trim() }));
  }, [checking, user, sessionId]);

  if (state.loading) return <Loader label="Cancelling the order" />;

  return (
    <ResultCard
      tone="error"
      kicker="Payment not completed"
      title="No charge made"
      actions={
        <>
          <Link to="/cart" className="btn btn-primary">
            Back to cart
          </Link>
          <Link to="/catalog" className="btn btn-ghost">
            Keep shopping
          </Link>
        </>
      }
    >
      {state.message}
    </ResultCard>
  );
}
