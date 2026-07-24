"use client";

import { ShieldAlert } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface MlGuardianCardProps {
  risk: string;
  holdRecommended: boolean;
  recommendation?: string;
}

export function MlGuardianCard({
  risk,
  holdRecommended,
  recommendation = holdRecommended ? "hold deployment" : "monitor",
}: MlGuardianCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ShieldAlert className="size-4 text-rose-400" aria-hidden="true" />
          ML Guardian
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Deployment risk</span>
          <Badge variant={holdRecommended ? "destructive" : "secondary"}>{risk}</Badge>
        </div>
        <p className="text-sm">
          Recommendation:{" "}
          <span className="font-medium text-rose-300">{recommendation}</span>
        </p>
      </CardContent>
    </Card>
  );
}
