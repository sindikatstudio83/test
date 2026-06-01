import { createClient } from "@supabase/supabase-js";
import { supabaseAnonKey, supabaseUrl } from "./config";

export function createPublicSupabase() {
  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  });
}
