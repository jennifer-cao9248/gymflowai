"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { useSupabaseSession } from "@/hooks/use-supabase-session";
import { Button } from "@/components/ui/button";

export function AuthControls() {
  const router = useRouter();
  const { session, loading } = useSupabaseSession();

  if (loading) {
    return <p className="text-sm text-slate-500">Checking auth...</p>;
  }

  if (!session) {
    return (
      <Link className="text-sm font-medium text-blue-600 hover:text-blue-500" href="/auth">
        Sign in
      </Link>
    );
  }

  async function handleSignOut() {
    const supabase = createSupabaseBrowserClient();
    await supabase.auth.signOut();
    router.push("/auth");
    router.refresh();
  }

  return (
    <div className="flex items-center gap-3">
      <p className="text-sm text-slate-600">{session.user.email}</p>
      <Button onClick={handleSignOut} variant="secondary">
        Sign out
      </Button>
    </div>
  );
}
