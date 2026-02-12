"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { useSupabaseSession } from "@/hooks/use-supabase-session";

export default function AuthPage() {
  const router = useRouter();
  const { session, loading } = useSupabaseSession();
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (session) {
      router.replace("/members");
    }
  }, [router, session]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    setStatus("");

    const supabase = createSupabaseBrowserClient();
    const emailRedirectTo = `${window.location.origin}/members`;
    const { error: signInError } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo },
    });

    if (signInError) {
      setError(signInError.message);
    } else {
      setStatus("Magic link sent. Check your email to sign in.");
    }

    setSubmitting(false);
  }

  if (loading) {
    return <p className="text-sm text-slate-500">Loading auth status...</p>;
  }

  return (
    <div className="mx-auto max-w-md">
      <Card className="space-y-4">
        <h1 className="text-xl font-semibold text-slate-900">Sign in</h1>
        <p className="text-sm text-slate-600">Use Supabase email OTP to access the app.</p>
        <form className="space-y-3" onSubmit={handleSubmit}>
          <input
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none ring-blue-500 focus:ring-2"
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@example.com"
            required
            type="email"
            value={email}
          />
          <Button className="w-full" disabled={submitting} type="submit">
            {submitting ? "Sending..." : "Send magic link"}
          </Button>
        </form>
        {status ? <p className="text-sm text-green-700">{status}</p> : null}
        {error ? <p className="text-sm text-red-700">{error}</p> : null}
      </Card>
    </div>
  );
}
