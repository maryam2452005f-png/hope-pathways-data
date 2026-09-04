import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { ScanLine, FlaskConical, Dna, ShieldCheck } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { useSession, useRoles, useProfile } from "@/hooks/useAuth";
import { claimPatientRecord } from "@/lib/patients.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { StatusBadge, CategoryIcon, formatDate } from "@/components/records";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — OncoTrack" },
      {
        name: "description",
        content:
          "Your OncoTrack dashboard: patient records, examinations awaiting review, results and quality control status.",
      },
      { property: "og:title", content: "Dashboard — OncoTrack" },
      {
        property: "og:description",
        content: "Tumour diagnostics records, results and review queue.",
      },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const { session } = useSession();
  const userId = session?.user.id;
  const { isStaff, loading } = useRoles(userId);
  const { data: profile } = useProfile(userId);

  return (
    <div className="mx-auto max-w-6xl px-5 py-12">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold">
            {isStaff ? "Technologist dashboard" : "Patient dashboard"}
          </h1>
          <p className="mt-2 text-muted-foreground">
            {profile?.full_name ? `Signed in as ${profile.full_name}` : session?.user.email}
          </p>
        </div>
        {isStaff ? (
          <Button asChild variant="outline">
            <Link to="/quality">
              <ShieldCheck className="size-4" /> Quality control
            </Link>
          </Button>
        ) : null}
      </div>

      {loading ? (
        <p className="mt-10 text-sm text-muted-foreground">Loading your records…</p>
      ) : isStaff ? (
        <StaffDashboard />
      ) : (
        <PatientDashboard userId={userId!} />
      )}
    </div>
  );
}

function StaffDashboard() {
  const patients = useQuery({
    queryKey: ["patients"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("patients")
        .select("id, mrn, full_name, tumor_type, primary_site, stage, status, diagnosis_date")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const exams = useQuery({
    queryKey: ["exams-overview"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("examinations")
        .select(
          "id, name, category, status, performed_at, requested_at, patient_id, patients(full_name, mrn), exam_results(id, review_status, abnormal)",
        )
        .order("requested_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const qc = useQuery({
    queryKey: ["qc-summary"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("qc_checks")
        .select("id, outcome, equipment, performed_on")
        .order("performed_on", { ascending: false })
        .limit(30);
      if (error) throw error;
      return data ?? [];
    },
  });

  const examRows = exams.data ?? [];
  const pendingReview = examRows.filter((e) =>
    (e.exam_results ?? []).some((r) => r.review_status === "pending"),
  );
  const failedQc = (qc.data ?? []).filter((c) => c.outcome === "fail");

  return (
    <div className="mt-8 space-y-8">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Patients" value={patients.data?.length ?? 0} icon={FlaskConical} />
        <Stat label="Examinations" value={examRows.length} icon={ScanLine} />
        <Stat label="Results awaiting review" value={pendingReview.length} icon={Dna} tone="warn" />
        <Stat
          label="Failed quality checks"
          value={failedQc.length}
          icon={ShieldCheck}
          tone={failedQc.length ? "bad" : "ok"}
        />
      </div>

      <section className="panel overflow-hidden">
        <header className="flex items-center justify-between border-b border-border px-6 py-4">
          <h2 className="font-display text-lg font-semibold">Patients</h2>
          <span className="text-sm text-muted-foreground">{patients.data?.length ?? 0} records</span>
        </header>
        <div className="divide-y divide-border">
          {(patients.data ?? []).map((p) => (
            <Link
              key={p.id}
              to="/patients/$patientId"
              params={{ patientId: p.id }}
              className="flex flex-wrap items-center justify-between gap-3 px-6 py-4 transition-colors hover:bg-surface"
            >
              <div>
                <p className="font-medium">{p.full_name}</p>
                <p className="text-sm text-muted-foreground">
                  {p.mrn} · {p.tumor_type}
                  {p.primary_site ? ` · ${p.primary_site}` : ""}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {p.stage ? <Badge variant="secondary">Stage {p.stage}</Badge> : null}
                <StatusBadge status={p.status} />
              </div>
            </Link>
          ))}
          {patients.data?.length === 0 ? (
            <p className="px-6 py-6 text-sm text-muted-foreground">No patient records yet.</p>
          ) : null}
        </div>
      </section>

      <section className="panel overflow-hidden">
        <header className="border-b border-border px-6 py-4">
          <h2 className="font-display text-lg font-semibold">Results awaiting review</h2>
          <p className="text-sm text-muted-foreground">
            Patients cannot see a result until it has been signed off.
          </p>
        </header>
        <div className="divide-y divide-border">
          {pendingReview.map((e) => (
            <Link
              key={e.id}
              to="/patients/$patientId"
              params={{ patientId: e.patient_id }}
              className="flex flex-wrap items-center justify-between gap-3 px-6 py-4 transition-colors hover:bg-surface"
            >
              <div className="flex items-start gap-3">
                <CategoryIcon category={e.category} />
                <div>
                  <p className="font-medium">{e.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {e.patients?.full_name} · {e.patients?.mrn} · performed{" "}
                    {formatDate(e.performed_at)}
                  </p>
                </div>
              </div>
              <Badge className="bg-warning text-warning-foreground">Pending sign-off</Badge>
            </Link>
          ))}
          {pendingReview.length === 0 ? (
            <p className="px-6 py-6 text-sm text-muted-foreground">
              Everything reported has been reviewed.
            </p>
          ) : null}
        </div>
      </section>
    </div>
  );
}

function PatientDashboard({ userId }: { userId: string }) {
  const record = useQuery({
    queryKey: ["my-patient-record", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("patients")
        .select(
          "id, mrn, full_name, tumor_type, primary_site, stage, status, diagnosis_date, date_of_birth",
        )
        .eq("user_id", userId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const exams = useQuery({
    queryKey: ["my-exams", record.data?.id],
    enabled: Boolean(record.data?.id),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("examinations")
        .select(
          "id, name, category, modality, body_region, status, performed_at, requested_at, protocols(title, version), exam_results(id, findings, impression, measurements, abnormal, reported_at, review_status)",
        )
        .eq("patient_id", record.data!.id)
        .order("requested_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  if (record.isLoading) {
    return <p className="mt-10 text-sm text-muted-foreground">Loading your record…</p>;
  }

  if (!record.data) {
    return <ClaimRecordCard />;
  }

  const patient = record.data;

  return (
    <div className="mt-8 space-y-6">
      <section className="panel p-6">
        <h2 className="font-display text-lg font-semibold">{patient.full_name}</h2>
        <p className="text-sm text-muted-foreground">
          {patient.mrn} · born {formatDate(patient.date_of_birth)}
        </p>
        <dl className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="Diagnosis" value={patient.tumor_type} />
          <Field label="Primary site" value={patient.primary_site ?? "—"} />
          <Field label="Stage" value={patient.stage ?? "—"} />
          <Field label="Diagnosed" value={formatDate(patient.diagnosis_date)} />
        </dl>
      </section>

      <section className="space-y-4">
        <h2 className="font-display text-lg font-semibold">Your examinations and results</h2>
        {(exams.data ?? []).map((exam) => {
          const approved = (exam.exam_results ?? []).filter(
            (r) => r.review_status === "approved" || r.review_status === undefined,
          );
          return (
            <article key={exam.id} className="panel p-6">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <CategoryIcon category={exam.category} />
                  <div>
                    <h3 className="font-display text-base font-semibold">{exam.name}</h3>
                    <p className="text-sm text-muted-foreground">
                      {exam.category}
                      {exam.modality ? ` · ${exam.modality}` : ""}
                      {exam.body_region ? ` · ${exam.body_region}` : ""}
                    </p>
                  </div>
                </div>
                <StatusBadge status={exam.status} />
              </div>
              <p className="mt-3 text-sm text-muted-foreground">
                Requested {formatDate(exam.requested_at)} · Performed {formatDate(exam.performed_at)}
                {exam.protocols
                  ? ` · Protocol: ${exam.protocols.title} (${exam.protocols.version})`
                  : ""}
              </p>

              {approved.length === 0 ? (
                <p className="mt-4 rounded-lg bg-surface px-4 py-3 text-sm text-muted-foreground">
                  The result is still being prepared or reviewed. It appears here once it has been
                  approved.
                </p>
              ) : (
                approved.map((result) => (
                  <div key={result.id} className="mt-4 rounded-lg bg-surface p-4">
                    <p className="text-sm leading-relaxed">{result.findings}</p>
                    {result.impression ? (
                      <p className="mt-2 text-sm font-medium">{result.impression}</p>
                    ) : null}
                    <Measurements value={result.measurements} />
                  </div>
                ))
              )}
            </article>
          );
        })}
        {exams.data?.length === 0 ? (
          <p className="text-sm text-muted-foreground">No examinations recorded yet.</p>
        ) : null}
      </section>
    </div>
  );
}

function ClaimRecordCard() {
  const [mrn, setMrn] = useState("");
  const [dob, setDob] = useState("");
  const claim = useServerFn(claimPatientRecord);
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: () => claim({ data: { mrn, dateOfBirth: dob } }),
    onSuccess: (result) => {
      if (result.ok) {
        toast.success(result.message);
        queryClient.invalidateQueries();
      } else {
        toast.error(result.message);
      }
    },
    onError: () => toast.error("Could not link the record right now."),
  });

  return (
    <div className="panel mt-8 max-w-xl p-6">
      <h2 className="font-display text-lg font-semibold">Link your medical record</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        Enter the medical record number printed on your appointment letter and your date of birth to
        connect your account to your record.
      </p>
      <form
        className="mt-5 space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          mutation.mutate();
        }}
      >
        <div className="space-y-2">
          <Label htmlFor="mrn">Medical record number</Label>
          <Input
            id="mrn"
            required
            placeholder="ONC-10241"
            value={mrn}
            onChange={(e) => setMrn(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="dob">Date of birth</Label>
          <Input
            id="dob"
            type="date"
            required
            value={dob}
            onChange={(e) => setDob(e.target.value)}
          />
        </div>
        <Button type="submit" disabled={mutation.isPending}>
          {mutation.isPending ? "Linking…" : "Link my record"}
        </Button>
      </form>
    </div>
  );
}

function Stat({
  label,
  value,
  icon: Icon,
  tone = "neutral",
}: {
  label: string;
  value: number;
  icon: React.ElementType;
  tone?: "neutral" | "ok" | "warn" | "bad";
}) {
  const toneClass =
    tone === "bad"
      ? "text-destructive"
      : tone === "warn"
        ? "text-warning-foreground"
        : tone === "ok"
          ? "text-success"
          : "text-primary";
  return (
    <div className="panel p-5">
      <Icon className={`size-5 ${toneClass}`} />
      <p className="mt-3 font-display text-3xl font-semibold">{value}</p>
      <p className="text-sm text-muted-foreground">{label}</p>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-[0.12em] text-muted-foreground">{label}</dt>
      <dd className="mt-1 font-medium">{value}</dd>
    </div>
  );
}

export function Measurements({ value }: { value: unknown }) {
  const rows = Array.isArray(value)
    ? (value as { label?: string; value?: string; unit?: string; reference?: string }[])
    : [];
  if (rows.length === 0) return null;
  return (
    <table className="mt-3 w-full text-sm">
      <tbody>
        {rows.map((row, i) => (
          <tr key={i} className="border-t border-border">
            <td className="py-2 pr-3 text-muted-foreground">{row.label}</td>
            <td className="py-2 pr-3 font-mono font-medium">
              {row.value}
              {row.unit ? ` ${row.unit}` : ""}
            </td>
            <td className="py-2 text-xs text-muted-foreground">{row.reference}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
