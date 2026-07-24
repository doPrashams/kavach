"use client";

import { ExternalLink, GitPullRequest } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { FixResponse } from "@/lib/types";

interface PrCardProps {
  fix: FixResponse | null;
}

export function PrCard({ fix }: PrCardProps) {
  if (!fix) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Fixer PR</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Waiting for Fixer output…</p>
        </CardContent>
      </Card>
    );
  }

  const { artifacts, pr_ref: prRef } = fix;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <GitPullRequest className="size-4 text-violet-400" aria-hidden="true" />
          Fixer PR
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <Badge>{artifacts.scenario}</Badge>
          <Badge variant="secondary">{artifacts.branch_name}</Badge>
        </div>
        <h4 className="font-medium">{artifacts.pr_title}</h4>
        <p className="text-sm text-muted-foreground">{artifacts.blast_radius_summary}</p>
        <pre className="max-h-32 overflow-auto rounded-lg bg-muted/30 p-3 text-xs">
          {artifacts.diff}
        </pre>
        {prRef ? (
          <a
            href={prRef}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 text-sm text-sky-400 hover:underline"
          >
            Open pull request
            <ExternalLink className="size-3.5" aria-hidden="true" />
          </a>
        ) : null}
      </CardContent>
    </Card>
  );
}
