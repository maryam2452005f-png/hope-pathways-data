import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { useSession, useRoles } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StatusBadge, CategoryIcon, formatDate } from "@/components/records";
import { Measurements } from "@/routes/_authenticated/dashboard";

export const Route = createFileRoute("/_authenticated/patients/$patientId")({
  head: () => ({
    meta: [
      { title: "Patient record — OncoTrack" },
      {
        name: "description",
        content:
          "Full tumour patient record: diagnosis, imaging, laboratory and genetic examinations with reported results and sign-off status.",
      },
      { property: "og:title", content: "Patient record — OncoTrack" },
      {
        property: "og:description",
        content: "Diagnosis, examinations and reported results for a single tumour patient.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: PatientRecord,
});

function PatientRecord() {
  const { patientId } = Route.useParams();
  const { session } = useSession();
  const { isStaff } = useRoles(session?.user.id);
  const queryClient = useQueryClient();

  const patient = useQuery({
    queryKey: ["patient", patientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("patients")
        .select(
          "id, mrn, full_name, date_of_birth, sex, tumor_type, primary_site, stage, status, diagnosis_date",
        )
        .eq("id", patientId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const exams = useQuery({
    queryKey: ["patient-exams", patientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("examinations")
        .select(
          "id, name, category, modality, body_region, status, priority, requested_at, performed_at, notes, protocols(title, version), exam_results(id, findings, impression, measurements, abnormal, reported_at, review_status, review_notes)",
        )
        .eq("patient_id", patientId)
        .order("requested_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const signOff = useMutation({
    mutationFn: async ({ resultId, status }: { resultId: string; status: string }) => {
      const { error } = await supabase
        .from("exam_results")
        .update({
          review_status: status,
          reviewed_by: session?.user.id ?? null,
          reviewed_at: new Date().toISOString(),
        })
        .eq("id", resultId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Review status updated.");
      queryClient.invalidateQueries();
    },
    onError: () => toast.error("Could not update the review status."),
  });

  if (patient.isLoading) {
    return <p className="mx-auto max-w-5xl px-5 py-16 text-sm text-muted-foreground">Loading…</p>;
  }

  if (!patient.data) {
    return (
      <div className="mx-auto max-w-5xl px-5 py-16">
        <h1 className="text-2xl font-semibold">Record not available</h1>
        <p className="mt-2 text-muted-foreground">
          This patient record does not exist, or you do not have access to it.
        </p>
        <Button asChild className="mt-6" variant="outline">
          <Link to="/dashboard">Back to dashboard</Link>
        </Button>
      </div>
    );
  }

  const p = patient.data;

  return (
    <div className="mx-auto max-w-5xl px-5 py-12">
      <Button asChild variant="ghost" size="sm">
        <Link to="/dashboard">
          <ArrowLeft className="size-4" /> Dashboard
        </Link>
      </Button>

      <section className="panel mt-4 p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="font-display text-2xl font-semibold">{p.full_name}</h1>
            <p className="text-sm text-muted-foreground">
              {p.mrn} · born {formatDate(p.date_of_birth)}
              {p.sex ? ` · ${p.sex}` : ""}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {p.stage ? <Badge variant="secondary">Stage {p.stage}</Badge> : null}
            <StatusBadge status={p.status} />
          </div>
        </div>
        <dl className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="Diagnosis" value={p.tumor_type} />
          <Field label="Primary site" value={p.primary_site ?? "—"} />
          <Field label="Stage" value={p.stage ?? "—"} />
          <Field label="Diagnosed" value={formatDate(p.diagnosis_date)} />
        </dl>
      </section>

      <h2 className="mt-10 font-display text-lg font-semibold">Examinations</h2>
      <div className="mt-4 space-y-4">
        {(exams.data ?? []).map((exam) => (
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

            {(exam.exam_results ?? []).length === 0 ? (
              <p className="mt-4 rounded-lg bg-surface px-4 py-3 text-sm text-muted-foreground">
                No result reported yet.
              </p>
            ) : (
              (exam.exam_results ?? []).map((result) => (
                <div key={result.id} className="mt-4 rounded-lg bg-surface p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <StatusBadge status={result.review_status} />
                    {result.abnormal ? <Badge variant="destructive">Abnormal</Badge> : null}
                    <span className="text-xs text-muted-foreground">
                      Reported {formatDate(result.reported_at)}
                    </span>
                  </div>
                  <p className="mt-3 text-sm leading-relaxed">{result.findings}</p>
                  {result.impression ? (
                    <p className="mt-2 text-sm font-medium">{result.impression}</p>
                  ) : null}
                  <Measurements value={result.measurements} />
                  {isStaff && result.review_status === "pending" ? (
                    <div className="mt-4 flex gap-2">
                      <Button
                        size="sm"
                        disabled={signOff.isPending}
                        onClick={() =>
                          signOff.mutate({ resultId: result.id, status: "approved" })
                        }
                      >
                        Approve and release
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={signOff.isPending}
                        onClick={() =>
                          signOff.mutate({ resultId: result.id, status: "rejected" })
                        }
                      >
                        Send back
                      </Button>
                    </div>
                  ) : null}
                </div>
              ))
            )}
          </article>
        ))}
        {exams.data?.length === 0 ? (
          <p className="text-sm text-muted-foreground">No examinations recorded yet.</p>
        ) : null}
      </div>
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
