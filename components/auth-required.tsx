"use client";

import Link from "next/link";
import type { Session } from "@supabase/supabase-js";
import { useSupabaseSession } from "@/hooks/use-supabase-session";
import { Card } from "@/components/ui/card";

type AuthRequiredProps = {
  children: (session: Session) => React.ReactNode;
};

export function AuthRequired({ children }: AuthRequiredProps) {
  const { session, loading } = useSupabaseSession();

  if (loading) {
    return <p className="text-sm text-slate-500">Loading...</p>;
  }

  if (!session) {
    return (
      <Card className="max-w-xl">
        <h1 className="text-lg font-semibold text-slate-900">Sign in required</h1>
        <p className="mt-2 text-sm text-slate-600">
          Please <Link href="/auth">sign in</Link> before using workout pages.
        </p>
      </Card>
    );
  }

  return <>{children(session)}</>;
}
