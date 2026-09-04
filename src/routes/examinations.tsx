import { createFileRoute, Link } from "@tanstack/react-router";

import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/examinations")({
  head: () => ({
    meta: [
      { title: "Examinations recorded — OncoTrack" },
      {
        name: "description",
        content:
          "What OncoTrack records for CT, MRI, PET-CT, tumour markers, histopathology and genetic panels, and how results are reported.",
      },
      { property: "og:title", content: "Examinations recorded — OncoTrack" },
      {
        property: "og:description",
        content:
          "Imaging, laboratory and genetic examinations for tumour patients: what is captured, and how each result is reported and reviewed.",
      },
    ],
  }),
  component: Examinations,
});

const groups = [
  {
    title: "Radiology and imaging",
    tests: [
      {
        name: "CT with contrast",
        detail:
          "Chest, abdomen and pelvis staging and follow-up. Records contrast volume, phase timing, slice thickness and RECIST 1.1 target-lesion diameters.",
      },
      {
        name: "MRI with gadolinium",
        detail:
          "Brain, pelvis, liver and spine. Records sequence set, contrast dose, isotropic resolution and RANO response category for CNS disease.",
      },
      {
        name: "PET-CT (FDG)",
        detail:
          "Whole-body metabolic assessment. Records fasting glucose, injected activity, uptake time and SUVmax per lesion.",
      },
      {
        name: "Ultrasound",
        detail:
          "Breast, neck, abdomen and image-guided biopsy support. Records probe, lesion dimensions and elastography where used.",
      },
    ],
  },
  {
    title: "Biological and laboratory testing",
    tests: [
      {
        name: "Tumour markers",
        detail:
          "CEA, CA 19-9, CA 125, AFP, PSA, beta-hCG and LDH with assay reference interval and delta against the previous value.",
      },
      {
        name: "Haematology and biochemistry",
        detail:
          "Full blood count, renal and liver panels — the safety baseline before contrast studies and cytotoxic cycles.",
      },
      {
        name: "Histopathology and immunohistochemistry",
        detail:
          "Grade, margins, lymphovascular invasion, ER/PR/HER2, Ki-67, PD-L1 and mismatch repair protein status.",
      },
      {
        name: "Flow cytometry",
        detail: "Immunophenotyping for haematological tumours with marker panels and blast counts.",
      },
    ],
  },
  {
    title: "Genetic and molecular testing",
    tests: [
      {
        name: "Somatic NGS panel",
        detail:
          "52-gene solid tumour panel from FFPE tissue. Records tumour cellularity, mean coverage, variant allele frequency and AMP/ASCO/CAP tier.",
      },
      {
        name: "Germline predisposition",
        detail:
          "BRCA1/2, PALB2 and Lynch syndrome genes with copy-number analysis, reported alongside counselling status.",
      },
      {
        name: "Single-gene and fusion assays",
        detail:
          "EGFR, KRAS, BRAF, ALK, ROS1 and NTRK by PCR, FISH or RNA fusion panel for targeted therapy decisions.",
      },
      {
        name: "Tumour mutational burden and MSI",
        detail: "Immunotherapy eligibility markers reported with the assay's cut-off values.",
      },
    ],
  },
];

function Examinations() {
  return (
    <div className="mx-auto max-w-6xl px-5 py-16">
      <h1 className="text-3xl font-semibold sm:text-4xl">What each examination records</h1>
      <p className="mt-3 max-w-2xl text-muted-foreground">
        Every request stores the patient, category, modality, body region, priority, the protocol it
        follows and the person who reported it. Results carry findings, an impression, measured
        values with reference ranges, and a review status before a patient can see them.
      </p>

      <div className="mt-10 space-y-10">
        {groups.map((group) => (
          <section key={group.title}>
            <h2 className="text-xl font-semibold">{group.title}</h2>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              {group.tests.map((test) => (
                <article key={test.name} className="panel p-5">
                  <h3 className="font-display text-base font-semibold">{test.name}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    {test.detail}
                  </p>
                </article>
              ))}
            </div>
          </section>
        ))}
      </div>

      <div className="panel mt-12 flex flex-wrap items-center justify-between gap-4 p-6">
        <p className="max-w-lg text-sm text-muted-foreground">
          Live records, result entry and review sign-off live inside the dashboards.
        </p>
        <Button asChild>
          <Link to="/auth">Sign in to a dashboard</Link>
        </Button>
      </div>
    </div>
  );
}
