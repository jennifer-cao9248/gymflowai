"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { AuthRequired } from "@/components/auth-required";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { Database } from "@/lib/database.types";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

type SessionRow = Database["public"]["Tables"]["sessions"]["Row"];
type SetResultRow = Database["public"]["Tables"]["set_results"]["Row"];

type SessionWithMember = SessionRow & {
  member: { id: string; name: string } | null;
};

type PlannedExercise = {
  id: string;
  order_index: number;
  exercise: { id: string; name: string } | null;
};

type CapturedResult = {
  reps: number;
  weight: number | null;
  unit: "lb" | "kg";
};

type SpeechRecognitionLikeEvent = {
  results: ArrayLike<ArrayLike<{ transcript: string }>>;
};

type SpeechRecognitionLike = {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  onresult: ((event: SpeechRecognitionLikeEvent) => void) | null;
  onerror: (() => void) | null;
  onnomatch: (() => void) | null;
  start: () => void;
};

type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

function parseVoiceTranscript(transcript: string): CapturedResult | null {
  const normalized = transcript.toLowerCase();
  const numbers = normalized.match(/\d+(?:\.\d+)?/g) ?? [];

  if (numbers.length === 0) {
    return null;
  }

  const [repsToken, weightToken] = numbers;
  if (!repsToken) {
    return null;
  }

  const reps = Number.parseInt(repsToken, 10);
  if (!Number.isFinite(reps) || reps <= 0) {
    return null;
  }

  const weight = weightToken ? Number.parseFloat(weightToken) : null;
  const unit = normalized.includes("kg") ? "kg" : "lb";

  return { reps, weight, unit };
}

function promptForManualResult(): CapturedResult | null {
  const repsInput = window.prompt("Reps (required):");
  if (!repsInput) {
    return null;
  }

  const reps = Number.parseInt(repsInput, 10);
  if (!Number.isFinite(reps) || reps <= 0) {
    return null;
  }

  const weightInput = window.prompt("Weight (optional):");
  const unitInput = (window.prompt("Unit (lb or kg). Default lb:", "lb") ?? "lb").toLowerCase();

  const weight = weightInput ? Number.parseFloat(weightInput) : null;
  const unit: "lb" | "kg" = unitInput === "kg" ? "kg" : "lb";

  return { reps, weight: Number.isFinite(weight as number) ? weight : null, unit };
}

async function captureResultFromVoice(): Promise<CapturedResult | null> {
  const speechWindow = window as Window & {
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
    SpeechRecognition?: SpeechRecognitionConstructor;
  };

  const speechApi = speechWindow.SpeechRecognition ?? speechWindow.webkitSpeechRecognition;

  if (!speechApi) {
    return promptForManualResult();
  }

  return new Promise((resolve) => {
    const recognition = new speechApi();
    recognition.lang = "en-US";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onresult = (event: SpeechRecognitionLikeEvent) => {
      const transcript = event.results?.[0]?.[0]?.transcript ?? "";
      const parsed = parseVoiceTranscript(transcript);
      if (parsed) {
        resolve(parsed);
      } else {
        resolve(promptForManualResult());
      }
    };

    recognition.onerror = () => resolve(promptForManualResult());
    recognition.onnomatch = () => resolve(promptForManualResult());
    recognition.start();
  });
}

function SessionDetailsContent() {
  const params = useParams<{ id: string }>();
  const sessionId = params.id;

  const [session, setSession] = useState<SessionWithMember | null>(null);
  const [planned, setPlanned] = useState<PlannedExercise[]>([]);
  const [results, setResults] = useState<SetResultRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [recordingExerciseId, setRecordingExerciseId] = useState<string | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadSession() {
      setLoading(true);
      setError("");
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
        setSession(sessionResult.data as SessionWithMember);
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

      setLoading(false);
    }

    if (sessionId) {
      void loadSession();
    }
  }, [sessionId]);

  const resultsByExercise = useMemo(() => {
    return results.reduce<Record<string, SetResultRow[]>>((acc, result) => {
      if (!acc[result.exercise_id]) {
        acc[result.exercise_id] = [];
      }
      acc[result.exercise_id].push(result);
      return acc;
    }, {});
  }, [results]);

  async function handleRecordResult(exerciseId: string) {
    setRecordingExerciseId(exerciseId);
    setError("");

    const captured = await captureResultFromVoice();
    if (!captured) {
      setRecordingExerciseId(null);
      return;
    }

    const currentSetNumber = (resultsByExercise[exerciseId] ?? []).reduce((max, row) => Math.max(max, row.set_number), 0);
    const setNumber = currentSetNumber + 1;

    const supabase = createSupabaseBrowserClient();
    const { data: insertedData, error: insertError } = await supabase
      .from("set_results")
      .insert({
        session_id: sessionId,
        exercise_id: exerciseId,
        set_number: setNumber,
        reps: captured.reps,
        weight: captured.weight,
        unit: captured.unit,
      })
      .select("*")
      .single();
    const data = (insertedData as SetResultRow | null) ?? null;

    if (insertError) {
      setError(insertError.message);
    } else if (data) {
      setResults((current) => [...current, data]);
    }

    setRecordingExerciseId(null);
  }

  if (loading) {
    return <p className="text-sm text-slate-500">Loading session...</p>;
  }

  if (!session) {
    return <p className="text-sm text-slate-500">Session not found.</p>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Session in progress</h1>
        <p className="text-sm text-slate-600">
          {session.member?.name ?? "Unknown member"} • {session.date}
        </p>
        {session.notes ? <p className="mt-1 text-sm text-slate-500">{session.notes}</p> : null}
      </div>

      <Card className="space-y-3">
        <p className="text-sm text-slate-600">Press “Record result”, then say something like: “10 reps at 135 lb”.</p>
        <ul className="space-y-3">
          {planned.map((plannedExercise) => {
            if (!plannedExercise.exercise) {
              return null;
            }

            const exerciseResults = (resultsByExercise[plannedExercise.exercise.id] ?? []).sort(
              (a, b) => a.set_number - b.set_number
            );

            return (
              <li className="rounded-md border border-slate-200 p-3" key={plannedExercise.id}>
                <div className="flex items-center justify-between gap-3">
                  <h2 className="font-medium text-slate-900">
                    {plannedExercise.order_index}. {plannedExercise.exercise.name}
                  </h2>
                  <Button
                    disabled={recordingExerciseId === plannedExercise.exercise.id}
                    onClick={() => handleRecordResult(plannedExercise.exercise!.id)}
                    type="button"
                  >
                    {recordingExerciseId === plannedExercise.exercise.id ? "Recording..." : "Record result"}
                  </Button>
                </div>

                {exerciseResults.length === 0 ? (
                  <p className="mt-2 text-sm text-slate-500">No sets recorded yet.</p>
                ) : (
                  <ol className="mt-2 space-y-1 text-sm text-slate-700">
                    {exerciseResults.map((result) => (
                      <li key={result.id}>
                        Set {result.set_number}: {result.reps} reps
                        {result.weight !== null ? ` @ ${result.weight}${result.unit}` : ""}
                      </li>
                    ))}
                  </ol>
                )}
              </li>
            );
          })}
        </ul>
      </Card>

      {error ? <p className="text-sm text-red-700">{error}</p> : null}
    </div>
  );
}

export default function SessionDetailsPage() {
  return <AuthRequired>{() => <SessionDetailsContent />}</AuthRequired>;
}
