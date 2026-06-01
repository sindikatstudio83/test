const supabaseUrlValue = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKeyValue = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrlValue || !supabaseAnonKeyValue) {
  throw new Error("Supabase podesavanja nijesu podesena u environment varijablama.");
}

export const supabaseUrl = supabaseUrlValue;
export const supabaseAnonKey = supabaseAnonKeyValue;
