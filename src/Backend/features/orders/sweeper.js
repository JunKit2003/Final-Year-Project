// Background loop: releases abandoned checkouts and re-checks refunds Stripe hasn't confirmed.
import { releaseExpiredHolds } from "./payment.js";
import { reconcilePendingRefunds } from "./service.js";

const jobs = [releaseExpiredHolds, () => reconcilePendingRefunds()];
export const addSweepJob = (fn) => jobs.push(fn);

export function startSweeper({ intervalMs = 60000 } = {}) {
  let running = false;
  const tick = async () => {
    if (running || !process.env.STRIPE_SECRET_KEY) return;
    running = true;
    try {
      for (const job of jobs) await job(new Date());
    } catch (error) {
      console.error("Sweeper failed:", error);
    } finally {
      running = false;
    }
  };
  const timer = setInterval(tick, intervalMs);
  timer.unref?.();
  return () => clearInterval(timer);
}
