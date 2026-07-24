"use client";

import { FileText } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface PostmortemCardProps {
  postmortem: string | null | undefined;
}

export function PostmortemCard({ postmortem }: PostmortemCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="size-4 text-emerald-400" aria-hidden="true" />
          Scribe postmortem
        </CardTitle>
      </CardHeader>
      <CardContent>
        {postmortem ? (
          <pre className="max-h-48 overflow-auto whitespace-pre-wrap rounded-lg bg-muted/30 p-3 text-sm">
            {postmortem}
          </pre>
        ) : (
          <p className="text-sm text-muted-foreground">Postmortem pending Scribe writeback…</p>
        )}
      </CardContent>
    </Card>
  );
}
