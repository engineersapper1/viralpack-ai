import { createClient } from "@supabase/supabase-js";

function readEnv(name) {
  return String(process.env[name] || "").trim();
}

export function hasSupabaseServerEnv() {
  return Boolean(
    readEnv("NEXT_PUBLIC_SUPABASE_URL") && readEnv("SUPABASE_SERVICE_ROLE_KEY")
  );
}

export function getSupabaseServerClient() {
  const url = readEnv("NEXT_PUBLIC_SUPABASE_URL");
  const key = readEnv("SUPABASE_SERVICE_ROLE_KEY");

  if (!url || !key) {
    throw new Error(
      "Missing Supabase server credentials. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY."
    );
  }

  return createClient(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
