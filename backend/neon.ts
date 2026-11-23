// Neon services for the armenia-driving-test project (noisy-smoke-18644029, branch main).
// Apply from this folder with `neon deploy --no-env-pull` (see README.md). `neon config plan` shows what would change.
//
// Free plan only: do not add aiGateway, buckets, dataApi or triggers here without asking Hayk.
// The function only needs the variables Neon injects (DATABASE_URL, NEON_AUTH_BASE_URL, NEON_AUTH_JWKS_URL).
import { defineConfig } from "@neon/config/v1";

export default defineConfig({
  auth: true,
  functions: {
    // The slug "api" is permanent: it is part of the invocation URL.
    api: {
      name: "armenia driving test progress API",
      source: "src/index.ts",
    },
  },
});
