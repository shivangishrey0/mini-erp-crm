import { TEST_DATABASE_URL, TEST_DIRECT_URL } from "./testDbConfig";

// Runs before each test file's module graph loads, so app.ts's
// `import "dotenv/config"` (which never overwrites an already-set env var)
// picks these up instead of the real server/.env values - tests only ever
// touch the isolated `test` schema, never the dev/prod one.
process.env.DATABASE_URL = TEST_DATABASE_URL;
process.env.DIRECT_URL = TEST_DIRECT_URL;
process.env.JWT_SECRET = "test-secret-not-for-production";
process.env.CORS_ORIGINS = "http://localhost:5173";
