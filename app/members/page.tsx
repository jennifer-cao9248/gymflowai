"use client";

import { FormEvent, useEffect, useState } from "react";
import { AuthRequired } from "@/components/auth-required";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { Database } from "@/lib/database.types";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

type MemberRow = Database["public"]["Tables"]["members"]["Row"];

function MembersContent() {
  const [members, setMembers] = useState<MemberRow[]>([]);
  const [newMemberName, setNewMemberName] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadMembers() {
      const supabase = createSupabaseBrowserClient();
      const { data, error: membersError } = await supabase.from("members").select("*").order("name");

      if (membersError) {
        setError(membersError.message);
      } else {
        setMembers(data ?? []);
      }
      setLoading(false);
    }

    void loadMembers();
  }, []);

  async function handleCreateMember(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = newMemberName.trim();

    if (!name) {
      return;
    }

    setSubmitting(true);
    setError("");

    const supabase = createSupabaseBrowserClient();
    const { data, error: insertError } = await supabase.from("members").insert({ name }).select("*").single();

    if (insertError) {
      setError(insertError.message);
    } else if (data) {
      setMembers((current) => [...current, data].sort((a, b) => a.name.localeCompare(b.name)));
      setNewMemberName("");
    }

    setSubmitting(false);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Members</h1>
        <p className="text-sm text-slate-600">Add and manage people you train.</p>
      </div>

      <Card className="space-y-3">
        <h2 className="text-lg font-medium text-slate-900">Add member</h2>
        <form className="flex flex-col gap-2 sm:flex-row" onSubmit={handleCreateMember}>
          <input
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none ring-blue-500 focus:ring-2"
            onChange={(event) => setNewMemberName(event.target.value)}
            placeholder="Member name"
            required
            value={newMemberName}
          />
          <Button disabled={submitting} type="submit">
            {submitting ? "Adding..." : "Add"}
          </Button>
        </form>
      </Card>

      <Card className="space-y-3">
        <h2 className="text-lg font-medium text-slate-900">Current members</h2>
        {loading ? <p className="text-sm text-slate-500">Loading members...</p> : null}
        {!loading && members.length === 0 ? <p className="text-sm text-slate-500">No members yet.</p> : null}
        <ul className="space-y-2">
          {members.map((member) => (
            <li className="rounded-md border border-slate-200 px-3 py-2 text-sm" key={member.id}>
              {member.name}
            </li>
          ))}
        </ul>
      </Card>

      {error ? <p className="text-sm text-red-700">{error}</p> : null}
    </div>
  );
}

export default function MembersPage() {
  return <AuthRequired>{() => <MembersContent />}</AuthRequired>;
}
