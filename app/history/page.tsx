"use client";

import { useEffect, useMemo, useState } from "react";
import { AuthRequired } from "@/components/auth-required";
import { Card } from "@/components/ui/card";
import type { Database } from "@/lib/database.types";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

type SessionRow = Database["public"]["Tables"]["sessions"]["Row"];
type SetResultRow = Database["public"]["Tables"]["set_results"]["Row"];

type SessionListItem = SessionRow & {
  member: { name: string } | null;
};

type PlannedExercise = {
  id: string;
  order_index: number;
  exercise: { id: string; name: string } | null;
};

type SessionDetail = SessionRow & {
  member: { id: string; name: string } | null;
};

function HistoryContent() {
  const [sessions, setSessions] = useState<SessionListItem[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [selectedSession, setSelectedSession] = useState<SessionDetail | null>(null);
  const [planned, setPlanned] = useState<PlannedExercise[]>([]);
  const [results, setResults] = useState<SetResultRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadSessions() {
      const supabase = createSupabaseBrowserClient();
      const { data, error: listError } = await supabase
        .from("sessions")
        .select("id, member_id, date, notes, member:members(name)")
        .order("date", { ascending: false });

      if (listError) {
        setError(listError.message);
      } else {
        const list = (data as SessionListItem[]) ?? [];
        setSessions(list);
        setSelectedSessionId(list[0]?.id ?? null);
      }

      setLoading(false);
    }

    void loadSessions();
  }, []);

  useEffect(() => {
    async function loadDetail(sessionId: string) {
      const supabase = createSupabaseBrowserClient();

      const [sessionResult, plannedResult, resultsResult] = await Promise.all([
        supabase.from("sessions").select("id, member_id, date, notes, member:members(id, name)").eq("id", sessionId).single(),
        supabase
          .from("session_planned_exercises")
          .select("id, order_index, exercise:exercises(id, name)")
          .eq("session_id", sessionId)
          .order("order_index"),
        supabase.from("set_results").select("*").eq("session_id", sessionId).order("set_number"),
      ]);

      if (sessionResult.error) {
        setError(sessionResult.error.message);
      } else {
        setSelectedSession(sessionResult.data as SessionDetail);
      }

      if (plannedResult.error) {
        setError(plannedResult.error.message);
      } else {
        setPlanned((plannedResult.data as PlannedExercise[]) ?? []);
      }

      if (resultsResult.error) {
        setError(resultsResult.error.message);
      } else {
        setResults((resultsResult.data as SetResultRow[]) ?? []);
      }
    }

    if (selectedSessionId) {
      void loadDetail(selectedSessionId);
    }
  }, [selectedSessionId]);

  const resultsByExercise = useMemo(() => {
    return results.reduce<Record<string, SetResultRow[]>>((acc, result) => {
      if (!acc[result.exercise_id]) {
        acc[result.exercise_id] = [];
      }
      acc[result.exercise_id].push(result);
      return acc;
    }, {});
  }, [results]);

  if (loading) {
    return <p className="text-sm text-slate-500">Loading history...</p>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Session History</h1>
        <p className="text-sm text-slate-600">Review past sessions and recorded set results.</p>
      </div>

      {sessions.length === 0 ? (
        <Card>
          <p className="text-sm text-slate-500">No sessions yet. Create one from “New Session”.</p>
        </Card>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[340px_1fr]">
          <Card className="h-fit">
            <h2 className="mb-3 text-base font-medium text-slate-900">Past sessions</h2>
            <ul className="space-y-2">
              {sessions.map((session) => (
                <li key={session.id}>
                  <button
                    className={`w-full rounded-md border px-3 py-2 text-left text-sm ${
                      selectedSessionId === session.id ? "border-blue-400 bg-blue-50" : "border-slate-200 hover:bg-slate-50"
                    }`}
                    onClick={() => setSelectedSessionId(session.id)}
                    type="button"
                  >
                    <p className="font-medium text-slate-900">{session.member?.name ?? "Unknown member"}</p>
                    <p className="text-slate-600">{session.date}</p>
                  </button>
                </li>
              ))}
            </ul>
          </Card>

          <Card>
            {!selectedSession ? (
              <p className="text-sm text-slate-500">Choose a session to view details.</p>
            ) : (
              <div className="space-y-4">
                <div>
                  <h2 className="text-lg font-medium text-slate-900">{selectedSession.member?.name ?? "Unknown member"}</h2>
                  <p className="text-sm text-slate-600">{selectedSession.date}</p>
                  {selectedSession.notes ? <p className="mt-1 text-sm text-slate-500">{selectedSession.notes}</p> : null}
                </div>

                <div className="space-y-3">
                  {planned.map((plannedExercise) => {
                    if (!plannedExercise.exercise) {
                      return null;
                    }

                    const exerciseResults = (resultsByExercise[plannedExercise.exercise.id] ?? []).sort(
                      (a, b) => a.set_number - b.set_number
                    );

                    return (
                      <div className="rounded-md border border-slate-200 p-3" key={plannedExercise.id}>
                        <h3 className="font-medium text-slate-900">
                          {plannedExercise.order_index}. {plannedExercise.exercise.name}
                        </h3>
                        {exerciseResults.length === 0 ? (
                          <p className="mt-1 text-sm text-slate-500">No results recorded.</p>
                        ) : (
                          <ul className="mt-2 space-y-1 text-sm text-slate-700">
                            {exerciseResults.map((result) => (
                              <li key={result.id}>
                                Set {result.set_number}: {result.reps} reps
                                {result.weight !== null ? ` @ ${result.weight}${result.unit}` : ""}
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </Card>
        </div>
      )}

      {error ? <p className="text-sm text-red-700">{error}</p> : null}
    </div>
  );
}

export default function HistoryPage() {
  return <AuthRequired>{() => <HistoryContent />}</AuthRequired>;
}
