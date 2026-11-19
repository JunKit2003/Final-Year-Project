import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // Several suites import database/index.js, which connects to MySQL and syncs tables on
    // import. Running files in parallel deadlocks those syncs, so run them one at a time.
    fileParallelism: false,
    // Handlers create the Stripe client lazily and refuse to without a key; the SDK is mocked.
    env: { STRIPE_SECRET_KEY: "sk_test_dummy_for_unit_tests" },
  },
});
