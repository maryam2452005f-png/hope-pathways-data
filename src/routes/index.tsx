import { createFileRoute, Link } from "@tanstack/react-router";
import { Dna, ScanLine, FlaskConical, ShieldCheck, ClipboardList, ArrowRight } from "lucide-react";

import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "OncoTrack — Tumour patient diagnostics records" },
      {
        name: "description",
        content:
          "Track imaging, laboratory and genetic testing for tumour patients, publish results, follow guideline protocols and log quality control checks.",
      },
      { property: "og:title", content: "OncoTrack — Tumour patient diagnostics records" },
      {
        property: "og:description",
        content:
          "Imaging, laboratory and genetic testing records with results, protocols and quality control for tumour care teams and patients.",
      },
    ],
  }),
  component: Home,
});

const pillars = [
  {
    icon: ScanLine,
    title: "Radiology examinations",
    body: "CT, MRI, PET-CT and ultrasound requests with modality, body region, priority and the protocol each study follows.",
  },
  {
    icon: FlaskConical,
    title: "Biological testing",
    body: "Tumour markers, haematology and biochemistry with measured values, reference intervals and trend against baseline.",
  },
  {
    icon: Dna,
    title: "Genetic testing",
    body: "Somatic panels and germline analysis with variant classification, coverage metrics and therapy implications.",
  },
];

const capabilities = [
  {
    icon: ClipboardList,
    title: "Results in one record",
    body: "Every examination carries its findings, impression, measured values and abnormal flags, linked to the patient it belongs to.",
    to: "/examinations",
    cta: "See what is recorded",
  },
  {
    icon: ShieldCheck,
    title: "Guideline protocols",
    body: "Step-by-step acquisition and reporting protocols — RECIST, RANO, NGS panel workflow and marker biochemistry.",
    to: "/protocols",
    cta: "Read the guidelines",
  },
];

function Home() {
  return (
    <div>
      <section className="grid-lines relative overflow-hidden border-b border-border bg-surface">
        <div className="mx-auto grid max-w-6xl gap-10 px-5 py-20 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <div>
            <span className="inline-flex items-center rounded-full border border-border bg-card px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-primary">
              Tumour diagnostics workspace
            </span>
            <h1 className="mt-5 text-4xl font-semibold leading-[1.08] sm:text-5xl">
              One record for every scan, lab test and gene panel a tumour patient needs.
            </h1>
            <p className="mt-5 max-w-xl text-base leading-relaxed text-muted-foreground">
              OncoTrack keeps imaging, biochemistry and genetic testing side by side — with the
              results, the protocol each test followed, and the quality control that stands behind
              them. Technologists manage the work; patients see their own approved results.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild size="lg">
                <Link to="/auth">
                  Open a dashboard <ArrowRight className="size-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link to="/protocols">Browse guideline protocols</Link>
              </Button>
            </div>
          </div>

          <div className="panel p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              Sample record
            </p>
            <p className="mt-3 font-display text-lg font-semibold">Karim El-Sayed · ONC-10242</p>
            <p className="text-sm text-muted-foreground">
              Lung adenocarcinoma · Stage IIIA · diagnosed Nov 2025
            </p>
            <dl className="mt-5 space-y-3 text-sm">
              <Row label="Follow-up CT chest" value="Partial response, −31%" tone="ok" />
              <Row label="Somatic 52-gene panel" value="EGFR exon 19 deletion" tone="flag" />
              <Row label="Review status" value="1 result awaiting sign-off" tone="warn" />
            </dl>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 py-16">
        <h2 className="text-2xl font-semibold">Three testing streams, one timeline</h2>
        <p className="mt-2 max-w-2xl text-muted-foreground">
          Radiology, biology and genetics are ordered, performed and reported in the same place, so
          a response assessment never depends on chasing three separate systems.
        </p>
        <div className="mt-8 grid gap-5 md:grid-cols-3">
          {pillars.map((p) => (
            <article key={p.title} className="panel p-6">
              <span className="brand-gradient flex size-10 items-center justify-center rounded-lg text-primary-foreground">
                <p.icon className="size-5" />
              </span>
              <h3 className="mt-4 text-lg font-semibold">{p.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{p.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="border-t border-border bg-surface py-16">
        <div className="mx-auto grid max-w-6xl gap-5 px-5 md:grid-cols-2">
          {capabilities.map((c) => (
            <article key={c.title} className="panel flex flex-col p-6">
              <c.icon className="size-6 text-primary" />
              <h3 className="mt-4 text-lg font-semibold">{c.title}</h3>
              <p className="mt-2 flex-1 text-sm leading-relaxed text-muted-foreground">{c.body}</p>
              <Button asChild variant="outline" className="mt-5 self-start">
                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                <Link to={c.to as any}>{c.cta}</Link>
              </Button>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}

function Row({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "ok" | "flag" | "warn";
}) {
  const toneClass =
    tone === "ok"
      ? "text-success"
      : tone === "flag"
        ? "text-destructive"
        : "text-warning-foreground";
  return (
    <div className="flex items-center justify-between gap-4 border-b border-border pb-2 last:border-0">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className={`font-medium ${toneClass}`}>{value}</dd>
    </div>
  );
}
