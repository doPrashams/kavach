"use client";

import { useEffect, useState } from "react";

import { Badge } from "@/components/ui/badge";

type HealthStatus = "loading" | "ok" | "error";

export function HealthBadge() {
  const [status, setStatus] = useState<HealthStatus>("loading");

  useEffect(() => {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
    fetch(`${apiUrl}/health`)
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error("unhealthy"))))
      .then(() => setStatus("ok"))
      .catch(() => setStatus("error"));
  }, []);

  const label =
    status === "loading" ? "Checking…" : status === "ok" ? "API healthy" : "API unreachable";

  const variant = status === "ok" ? "default" : status === "error" ? "destructive" : "secondary";

  return <Badge variant={variant}>{label}</Badge>;
}
