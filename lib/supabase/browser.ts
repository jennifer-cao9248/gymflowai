"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import { getSupabaseConfig } from "@/lib/supabase/config";

let browserClient: SupabaseClient<Database> | undefined;

export function createSupabaseBrowserClient() {
  if (!browserClient) {
    const { supabaseUrl, supabaseAnonKey } = getSupabaseConfig();
    browserClient = createBrowserClient<Database>(supabaseUrl, supabaseAnonKey);
  }

  return browserClient;
}
