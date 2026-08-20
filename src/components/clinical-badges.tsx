import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { ConfidenceTier } from "@/lib/db";

type Tone = "danger" | "warn" | "ok" | "neutral" | "info";

const toneClass: Record<Tone, string> = {
  danger: "border-destructive/40 bg-destructive/10 text-destructive",
  warn: "border-warning/50 bg-warning/15 text-warning-foreground",
  ok: "border-success/40 bg-success/10 text-success",
  info: "border-primary/30 bg-primary/10 text-primary",
  neutral: "border-border bg-muted text-muted-foreground",
};

export function ToneBadge({
  tone,
  children,
  className,
}: {
  tone: Tone;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Badge variant="outline" className={cn("font-medium", toneClass[tone], className)}>
      {children}
    </Badge>
  );
}

const TIER_LABEL: Record<ConfidenceTier, string> = {
  well_established: "Well established",
  moderate: "Moderate evidence",
  rare_contested: "Rare / contested",
};

export function TierBadge({ tier }: { tier: ConfidenceTier | null }) {
  if (!tier) return <ToneBadge tone="neutral">Unrated</ToneBadge>;
  const tone: Tone =
    tier === "well_established" ? "ok" : tier === "moderate" ? "warn" : "danger";
  return (
    <ToneBadge tone={tone} className="uppercase tracking-wide text-[11px]">
      {TIER_LABEL[tier] ?? tier}
    </ToneBadge>
  );
}

function severityTone(value?: string | null): Tone {
  const v = (value ?? "").toLowerCase();
  if (["high", "emergency", "critical", "severe", "urgent"].some((k) => v.includes(k)))
    return "danger";
  if (["caution", "moderate", "medium", "amber"].some((k) => v.includes(k))) return "warn";
  if (["low", "mild", "info", "routine", "benign"].some((k) => v.includes(k))) return "ok";
  return "neutral";
}

export function UrgencyBadge({ urgency }: { urgency: string | null }) {
  if (!urgency) return null;
  return <ToneBadge tone={severityTone(urgency)}>Urgency: {urgency}</ToneBadge>;
}

export function SeverityBadge({ severity }: { severity: string | null }) {
  if (!severity) return null;
  return <ToneBadge tone={severityTone(severity)}>{severity}</ToneBadge>;
}