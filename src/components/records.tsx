import { ScanLine, FlaskConical, Dna, ClipboardList } from "lucide-react";

import { Badge } from "@/components/ui/badge";

export function formatDate(value: string | null | undefined) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" });
}

export function CategoryIcon({ category }: { category: string }) {
  const key = category.toLowerCase();
  const Icon = key.startsWith("imag")
    ? ScanLine
    : key.startsWith("gen")
      ? Dna
      : key.startsWith("lab")
        ? FlaskConical
        : ClipboardList;
  return (
    <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-accent text-accent-foreground">
      <Icon className="size-4" />
    </span>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const key = status.toLowerCase();
  if (key === "approved" || key === "reported" || key === "pass" || key === "remission") {
    return <Badge className="bg-success text-success-foreground">{status}</Badge>;
  }
  if (key === "pending" || key === "scheduled" || key === "requested") {
    return <Badge className="bg-warning text-warning-foreground">{status}</Badge>;
  }
  if (key === "fail" || key === "rejected") {
    return <Badge variant="destructive">{status}</Badge>;
  }
  return <Badge variant="secondary">{status}</Badge>;
}
