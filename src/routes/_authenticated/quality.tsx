import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { useSession, useRoles } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { StatusBadge, formatDate } from "@/components/records";

export const Route = createFileRoute("/_authenticated/quality")({
  head: () => ({
    meta: [
      { title: "Quality control — OncoTrack" },
      {
        name: "description",
        content:
          "Equipment quality control log for CT, MRI, sequencing and laboratory analysers, with measured values, tolerances and pass or fail outcomes.",
      },
      { property: "og:title", content: "Quality control — OncoTrack" },
      {
        property: "og:description",
        content: "Daily and monthly equipment checks with measured values, tolerances and outcomes.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: QualityControl,
});

function QualityControl() {
  const { session } = useSession();
  const { isStaff, loading } = useRoles(session?.user.id);
  const queryClient = useQueryClient();

  const checks = useQuery({
    queryKey: ["qc-checks"],
    enabled: isStaff,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("qc_checks")
        .select("id, equipment, check_type, performed_on, outcome, measured_value, tolerance, notes")
        .order("performed_on", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const [form, setForm] = useState({
    equipment: "",
    check_type: "",
    measured_value: "",
    tolerance: "",
    outcome: "pass",
    notes: "",
  });

  const addCheck = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("qc_checks").insert({
        equipment: form.equipment,
        check_type: form.check_type,
        measured_value: form.measured_value || null,
        tolerance: form.tolerance || null,
        outcome: form.outcome,
        notes: form.notes || null,
        performed_by: session?.user.id ?? null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Quality check recorded.");
      setForm({
        equipment: "",
        check_type: "",
        measured_value: "",
        tolerance: "",
        outcome: "pass",
        notes: "",
      });
      queryClient.invalidateQueries({ queryKey: ["qc-checks"] });
    },
    onError: () => toast.error("Could not record the check."),
  });

  if (loading) {
    return <p className="mx-auto max-w-5xl px-5 py-16 text-sm text-muted-foreground">Loading…</p>;
  }

  if (!isStaff) {
    return (
      <div className="mx-auto max-w-5xl px-5 py-16">
        <h1 className="text-2xl font-semibold">Quality control</h1>
        <p className="mt-2 text-muted-foreground">
          The equipment quality log is available to clinical staff only.
        </p>
        <Button asChild className="mt-6" variant="outline">
          <Link to="/dashboard">Back to dashboard</Link>
        </Button>
      </div>
    );
  }

  const rows = checks.data ?? [];
  const failed = rows.filter((r) => r.outcome === "fail");

  return (
    <div className="mx-auto max-w-5xl px-5 py-12">
      <Button asChild variant="ghost" size="sm">
        <Link to="/dashboard">
          <ArrowLeft className="size-4" /> Dashboard
        </Link>
      </Button>

      <h1 className="mt-4 text-3xl font-semibold">Quality control</h1>
      <p className="mt-2 max-w-2xl text-muted-foreground">
        Every scanner, sequencer and analyser is checked against its tolerance before patient work.
        {failed.length
          ? ` ${failed.length} check${failed.length > 1 ? "s" : ""} currently outside tolerance.`
          : " All recorded checks are within tolerance."}
      </p>

      <section className="panel mt-8 p-6">
        <h2 className="font-display text-lg font-semibold">Record a check</h2>
        <form
          className="mt-5 grid gap-4 sm:grid-cols-2"
          onSubmit={(e) => {
            e.preventDefault();
            addCheck.mutate();
          }}
        >
          <div className="space-y-2">
            <Label htmlFor="equipment">Equipment</Label>
            <Input
              id="equipment"
              required
              placeholder="CT scanner 1"
              value={form.equipment}
              onChange={(e) => setForm({ ...form, equipment: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="check_type">Check</Label>
            <Input
              id="check_type"
              required
              placeholder="Daily CT number water phantom"
              value={form.check_type}
              onChange={(e) => setForm({ ...form, check_type: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="measured_value">Measured value</Label>
            <Input
              id="measured_value"
              placeholder="1.2 HU"
              value={form.measured_value}
              onChange={(e) => setForm({ ...form, measured_value: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="tolerance">Tolerance</Label>
            <Input
              id="tolerance"
              placeholder="± 4 HU"
              value={form.tolerance}
              onChange={(e) => setForm({ ...form, tolerance: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="outcome">Outcome</Label>
            <select
              id="outcome"
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              value={form.outcome}
              onChange={(e) => setForm({ ...form, outcome: e.target.value })}
            >
              <option value="pass">Pass</option>
              <option value="fail">Fail</option>
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Input
              id="notes"
              placeholder="Optional"
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
            />
          </div>
          <div className="sm:col-span-2">
            <Button type="submit" disabled={addCheck.isPending}>
              {addCheck.isPending ? "Saving…" : "Record check"}
            </Button>
          </div>
        </form>
      </section>

      <section className="panel mt-8 overflow-hidden">
        <header className="flex items-center justify-between border-b border-border px-6 py-4">
          <h2 className="font-display text-lg font-semibold">Check log</h2>
          <span className="text-sm text-muted-foreground">{rows.length} records</span>
        </header>
        <div className="divide-y divide-border">
          {rows.map((row) => (
            <div key={row.id} className="flex flex-wrap items-center justify-between gap-3 px-6 py-4">
              <div>
                <p className="font-medium">{row.equipment}</p>
                <p className="text-sm text-muted-foreground">
                  {row.check_type} · {formatDate(row.performed_on)}
                  {row.measured_value ? ` · ${row.measured_value}` : ""}
                  {row.tolerance ? ` (tolerance ${row.tolerance})` : ""}
                </p>
                {row.notes ? (
                  <p className="mt-1 text-sm text-muted-foreground">{row.notes}</p>
                ) : null}
              </div>
              <StatusBadge status={row.outcome} />
            </div>
          ))}
          {rows.length === 0 ? (
            <p className="px-6 py-6 text-sm text-muted-foreground">No checks recorded yet.</p>
          ) : null}
        </div>
      </section>
    </div>
  );
}
