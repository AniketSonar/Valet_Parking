const { createClient } = require("@supabase/supabase-js");
require("dotenv").config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  throw new Error(
    "SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is missing from environment variables."
  );
}

const supabase = createClient(
  supabaseUrl,
  supabaseServiceRoleKey,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

/**
 * IMPORTANT: never call auth.signInWithPassword() on the client above.
 * Doing so stores the user's session inside it, so every later request is made
 * as that user (not the service role) and Row Level Security starts rejecting
 * storage uploads / inserts ("new row violates row-level security policy").
 * Logins use a throw-away client from createAuthClient() instead.
 */
const createAuthClient = () =>
  createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false
    }
  });

console.log("SUPABASE URL:", supabaseUrl);
console.log(
  "SERVICE ROLE KEY EXISTS:",
  !!supabaseServiceRoleKey
);

module.exports = supabase;
module.exports.createAuthClient = createAuthClient;