import { createFileRoute, Link } from "@tanstack/react-router";
import { queryOptions, useQuery } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useSession } from "@/hooks/useAuth";

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
          "Imaging, laboratory and genetic testing protocols for tumour patients — available to signed-in clinical staff and patients.",
      },
      { property: "og:title", content: "Guideline protocols — OncoTrack" },
      {
        property: "og:description",
        content:
          "Sign in to view the imaging, laboratory and genetic protocols behind every tumour diagnostics result.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Protocols,
});

function Protocols() {
  const { session, loading } = useSession();
  const { data: protocols, isLoading } = useQuery({
    ...protocolsQuery,
    enabled: Boolean(session),
  });

  return (
    <div className="mx-auto max-w-5xl px-5 py-16">
      <h1 className="text-3xl font-semibold sm:text-4xl">Guideline protocols</h1>
      <p className="mt-3 max-w-2xl text-muted-foreground">
        Each examination in a patient record links to one of these protocols, so the acquisition,
        reporting and escalation steps behind a result are always traceable.
      </p>

      {loading ? (
        <p className="mt-10 text-sm text-muted-foreground">Checking your access…</p>
      ) : !session ? (
        <div className="panel mt-10 max-w-xl p-6">
          <h2 className="font-display text-lg font-semibold">Sign in to view the protocols</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            These clinical workflows are shared with signed-in staff and patients only.
          </p>
          <Button asChild className="mt-5">
            <Link to="/auth">Sign in</Link>
          </Button>
        </div>
      ) : isLoading ? (
        <p className="mt-10 text-sm text-muted-foreground">Loading protocols…</p>
      ) : (
        <ProtocolList protocols={protocols ?? []} />
      )}
    </div>
  );
}

function ProtocolList({ protocols }: { protocols: Protocol[] }) {
  return (
    <>


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
    </>

  );
}
