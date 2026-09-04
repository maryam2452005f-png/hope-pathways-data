import { createFileRoute } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";

type Protocol = {
  id: string;
  title: string;
  category: string;
  tumor_type: string | null;
  version: string;
  summary: string;
  steps: string[];
  source: string | null;
};

const protocolsQuery = queryOptions({
  queryKey: ["protocols"],
  queryFn: async (): Promise<Protocol[]> => {
    const { data, error } = await supabase
      .from("protocols")
      .select("id, title, category, tumor_type, version, summary, steps, source")
      .order("category")
      .order("title");
    if (error) throw error;
    return (data ?? []).map((row) => ({
      ...row,
      steps: Array.isArray(row.steps) ? (row.steps as string[]) : [],
    }));
  },
});

export const Route = createFileRoute("/protocols")({
  head: () => ({
    meta: [
      { title: "Guideline protocols — OncoTrack" },
      {
        name: "description",
        content:
          "Step-by-step imaging, laboratory and genetic testing protocols for tumour patients, including RECIST 1.1, RANO and NGS panel workflows.",
      },
      { property: "og:title", content: "Guideline protocols — OncoTrack" },
      {
        property: "og:description",
        content:
          "Imaging, laboratory and genetic protocols for tumour diagnostics with the exact steps each examination follows.",
      },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(protocolsQuery),
  component: Protocols,
});

function Protocols() {
  const { data: protocols } = useSuspenseQuery(protocolsQuery);

  return (
    <div className="mx-auto max-w-5xl px-5 py-16">
      <h1 className="text-3xl font-semibold sm:text-4xl">Guideline protocols</h1>
      <p className="mt-3 max-w-2xl text-muted-foreground">
        Each examination in a patient record links to one of these protocols, so the acquisition,
        reporting and escalation steps behind a result are always traceable.
      </p>

      <div className="mt-10 space-y-5">
        {protocols.map((protocol) => (
          <article key={protocol.id} className="panel p-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="font-display text-lg font-semibold">{protocol.title}</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  {protocol.category}
                  {protocol.tumor_type ? ` · ${protocol.tumor_type}` : ""}
                </p>
              </div>
              <Badge variant="secondary">{protocol.version}</Badge>
            </div>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{protocol.summary}</p>
            <ol className="mt-4 space-y-2 text-sm">
              {protocol.steps.map((step, i) => (
                <li key={i} className="flex gap-3">
                  <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-secondary text-[11px] font-semibold text-secondary-foreground">
                    {i + 1}
                  </span>
                  <span className="leading-relaxed">{step}</span>
                </li>
              ))}
            </ol>
            {protocol.source ? (
              <p className="mt-4 text-xs uppercase tracking-[0.12em] text-muted-foreground">
                Reference: {protocol.source}
              </p>
            ) : null}
          </article>
        ))}
      </div>
    </div>
  );
}
