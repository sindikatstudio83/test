import { createServerClient } from "@supabase/ssr";
import { NextRequest, NextResponse } from "next/server";
import { supabaseAnonKey, supabaseUrl } from "@/lib/supabase/config";

function cleanNextPath(value: FormDataEntryValue | null) {
  // FIX: Default was "/profil" which sent company/admin users to the wrong dashboard.
  // Changed to "/" — the client-side LoginForm already handles role-based redirect.
  // The server route is a fallback for JS-disabled flows only.
  if (typeof value !== "string" || !value.startsWith("/") || value.startsWith("//")) return "/";
  return value;
}

function loginUrl(request: NextRequest, error: string) {
  const url = new URL("/login", request.url);
  url.searchParams.set("error", error);
  return url;
}

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const email = String(formData.get("email") || "").trim();
  const password = String(formData.get("password") || "");
  const nextPath = cleanNextPath(formData.get("next"));

  if (!email || !password) {
    return NextResponse.redirect(loginUrl(request, "missing"), { status: 303 });
  }

  const response = NextResponse.redirect(new URL(nextPath, request.url), { status: 303 });
  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
      }
    }
  });

  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return NextResponse.redirect(loginUrl(request, "credentials"), { status: 303 });
  }

  return response;
}
