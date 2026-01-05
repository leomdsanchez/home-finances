import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config({ path: ".env.test", override: false });
dotenv.config({ path: ".env", override: false });

const requiredEnvVars = [
  "SUPABASE_URL",
  "SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
] as const;

requiredEnvVars.forEach((key) => {
  if (!process.env[key]) {
    throw new Error(
      `${key} is required for integration tests. Add it to .env.test or export it in your shell.`
    );
  }
});

export const SUPABASE_URL = process.env.SUPABASE_URL!;
export const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY!;
export const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
export const TEST_USER_PASSWORD =
  process.env.SUPABASE_TEST_PASSWORD ?? "TestPassword!123";

const authOptions = {
  autoRefreshToken: false,
  persistSession: false,
};

export const serviceRoleClient = createClient(
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY,
  { auth: authOptions }
);

export const anonTestClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: authOptions,
});
