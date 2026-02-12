"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AuthRequired } from "@/components/auth-required";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { Database } from "@/lib/database.types";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

type MemberRow = Database["public"]["Tables"]["members"]["Row"];
type ExerciseRow = Database["public"]["Tables"]["exercises"]["Row"];

function NewSessionContent() {
  const router = useRouter();
  const [members, setMembers] = useState<MemberRow[]>([]);
  const [exercises, setExercises] = useState<ExerciseRow[]>([]);
  const [selectedMemberId, setSelectedMemberId] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState("");
  const [query, setQuery] = useState("");
  const [plannedExercises, setPlannedExercises] = useState<ExerciseRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadData() {
      const supabase = createSupabaseBrowserClient();
      const [membersResult, exercisesResult] = await Promise.all([
        supabase.from("members").select("*").order("name"),
        supabase.from("exercises").select("*").order("name"),
      ]);

      if (membersResult.error) {
        setError(membersResult.error.message);
      } else {
        setMembers(membersResult.data ?? []);
      }

      if (exercisesResult.error) {
        setError(exercisesResult.error.message);
      } else {
        setExercises(exercisesResult.data ?? []);
      }

      setLoading(false);
    }

    void loadData();
  }, []);

  const suggestions = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    if (!normalizedQuery) {
      return [];
    }

    return exercises
      .filter((exercise) => {
        if (plannedExercises.some((planned) => planned.id === exercise.id)) {
          return false;
        }
        return exercise.name.toLowerCase().includes(normalizedQuery);
      })
      .slice(0, 8);
  }, [exercises, plannedExercises, query]);

  function addPlannedExercise(exercise: ExerciseRow) {
    if (plannedExercises.length >= 8) {
      setError("You can only add up to 8 planned exercises.");
      return;
    }
    setPlannedExercises((current) => [...current, exercise]);
    setQuery("");
    setError("");
  }

  async function addCustomExercise() {
    const name = query.trim();

    if (!name) {
      return;
    }

    const existing = exercises.find((exercise) => exercise.name.toLowerCase() === name.toLowerCase());
    if (existing) {
      addPlannedExercise(existing);
      return;
    }

    const supabase = createSupabaseBrowserClient();
    const { data, error: insertError } = await supabase
      .from("exercises")
      .insert({
        name,
        is_custom: true,
      })
      .select("*")
      .single();

    if (insertError) {
      setError(insertError.message);
      return;
    }

    if (data) {
      setExercises((current) => [...current, data].sort((a, b) => a.name.localeCompare(b.name)));
      addPlannedExercise(data);
    }
  }

  function removePlannedExercise(exerciseId: string) {
    setPlannedExercises((current) => current.filter((exercise) => exercise.id !== exerciseId));
  }

  async function handleCreateSession(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (!selectedMemberId) {
      setError("Select a member.");
      return;
    }

    if (plannedExercises.length < 5 || plannedExercises.length > 8) {
      setError("Add between 5 and 8 planned exercises.");
      return;
    }

    setCreating(true);

    const supabase = createSupabaseBrowserClient();
    const { data: sessionData, error: sessionError } = await supabase
      .from("sessions")
      .insert({
        member_id: selectedMemberId,
        date,
        notes: notes.trim() || null,
      })
      .select("id")
      .single();

    if (sessionError || !sessionData) {
      setError(sessionError?.message ?? "Could not create session.");
      setCreating(false);
      return;
    }

    const plannedRows = plannedExercises.map((exercise, index) => ({
      session_id: sessionData.id,
      exercise_id: exercise.id,
      order_index: index + 1,
    }));

    const { error: plannedError } = await supabase.from("session_planned_exercises").insert(plannedRows);

    if (plannedError) {
      setError(plannedError.message);
      setCreating(false);
      return;
    }

    router.push(`/sessions/${sessionData.id}`);
  }

  if (loading) {
    return <p className="text-sm text-slate-500">Loading members and exercises...</p>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Create Session</h1>
        <p className="text-sm text-slate-600">Pick a member and plan 5-8 exercises before starting.</p>
      </div>

      <form className="space-y-4" onSubmit={handleCreateSession}>
        <Card className="space-y-3">
          <div className="space-y-2">
            <label className="block text-sm font-medium text-slate-700" htmlFor="member">
              Member
            </label>
            <select
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none ring-blue-500 focus:ring-2"
              id="member"
              onChange={(event) => setSelectedMemberId(event.target.value)}
              required
              value={selectedMemberId}
            >
              <option value="">Select member...</option>
              {members.map((member) => (
                <option key={member.id} value={member.id}>
                  {member.name}
                </option>
              ))}
            </select>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <label className="block text-sm font-medium text-slate-700" htmlFor="date">
                Date
              </label>
              <input
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none ring-blue-500 focus:ring-2"
                id="date"
                onChange={(event) => setDate(event.target.value)}
                required
                type="date"
                value={date}
              />
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-medium text-slate-700" htmlFor="notes">
                Notes
              </label>
              <input
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none ring-blue-500 focus:ring-2"
                id="notes"
                onChange={(event) => setNotes(event.target.value)}
                placeholder="Optional session notes"
                type="text"
                value={notes}
              />
            </div>
          </div>
        </Card>

        <Card className="space-y-3">
          <h2 className="text-lg font-medium text-slate-900">Planned exercises ({plannedExercises.length}/8)</h2>
          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none ring-blue-500 focus:ring-2"
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Type exercise name..."
              value={query}
            />
            <Button
              onClick={addCustomExercise}
              type="button"
              variant="secondary"
            >
              Add custom
            </Button>
          </div>

          {suggestions.length > 0 ? (
            <ul className="rounded-md border border-slate-200">
              {suggestions.map((exercise) => (
                <li key={exercise.id}>
                  <button
                    className="w-full border-b border-slate-200 px-3 py-2 text-left text-sm hover:bg-slate-50 last:border-b-0"
                    onClick={() => addPlannedExercise(exercise)}
                    type="button"
                  >
                    {exercise.name} {exercise.is_custom ? "(custom)" : ""}
                  </button>
                </li>
              ))}
            </ul>
          ) : null}

          <ol className="space-y-2">
            {plannedExercises.map((exercise, index) => (
              <li className="flex items-center justify-between rounded-md border border-slate-200 px-3 py-2 text-sm" key={exercise.id}>
                <span>
                  {index + 1}. {exercise.name}
                </span>
                <Button onClick={() => removePlannedExercise(exercise.id)} type="button" variant="ghost">
                  Remove
                </Button>
              </li>
            ))}
          </ol>
          <p className="text-xs text-slate-500">MVP rule: you must plan at least 5 exercises and no more than 8.</p>
        </Card>

        <Button disabled={creating} type="submit">
          {creating ? "Creating..." : "Create session"}
        </Button>
      </form>

      {error ? <p className="text-sm text-red-700">{error}</p> : null}
    </div>
  );
}

export default function NewSessionPage() {
  return <AuthRequired>{() => <NewSessionContent />}</AuthRequired>;
}
