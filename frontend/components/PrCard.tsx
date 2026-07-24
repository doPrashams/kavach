"use client";

import { ExternalLink, GitMerge, GitPullRequest } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getRealPr } from "@/lib/real-data";
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
  const realPr = getRealPr();
  // The value_corruption fix points to the actual merged PR — render its real metadata.
  const isRealPr = Boolean(prRef && prRef === realPr.html_url);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <GitPullRequest className="size-4 text-violet-400" aria-hidden="true" />
          Fixer PR
          {isRealPr ? (
            <Badge className="ml-auto bg-purple-600/30 text-purple-200">
              <GitMerge className="mr-1 size-3" aria-hidden="true" /> merged
            </Badge>
          ) : null}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <Badge>{artifacts.scenario}</Badge>
          <Badge variant="secondary">{artifacts.branch_name}</Badge>
        </div>
        <h4 className="font-medium">{artifacts.pr_title}</h4>

        {isRealPr ? (
          <div className="space-y-2 rounded-lg border border-purple-500/30 bg-purple-950/20 p-3 text-xs">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <span className="font-mono text-muted-foreground">
                {realPr.repo}#{realPr.number}
              </span>
              <span className="font-semibold text-emerald-300">+{realPr.additions}</span>
              <span className="font-semibold text-red-300">−{realPr.deletions}</span>
              <span className="text-muted-foreground">{realPr.changed_files} files</span>
            </div>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-muted-foreground">
              <span>by @{realPr.author}</span>
              <span>·</span>
              <span>merged {realPr.merged_at?.slice(0, 10)}</span>
              <span>·</span>
              <span className="font-mono">{realPr.merge_commit_sha.slice(0, 7)}</span>
            </div>
            <ul className="space-y-0.5 pt-1">
              {realPr.files.map((f) => (
                <li key={f.filename} className="flex items-center justify-between gap-2 font-mono">
                  <span className="truncate text-foreground/80">{f.filename}</span>
                  <span className="shrink-0">
                    <span className="text-emerald-300">+{f.additions}</span>{" "}
                    <span className="text-red-300">−{f.deletions}</span>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">{artifacts.blast_radius_summary}</p>
        )}

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
            {isRealPr ? "Open merged pull request" : "Open pull requests"}
            <ExternalLink className="size-3.5" aria-hidden="true" />
          </a>
        ) : null}
      </CardContent>
    </Card>
  );
}
