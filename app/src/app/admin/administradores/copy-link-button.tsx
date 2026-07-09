"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

/// Copies the full invite URL (origin resolved in the browser — works no
/// matter which host/port serves the panel).
export function CopyLinkButton({ path }: { path: string }) {
  const [copied, setCopied] = useState(false);

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={async () => {
        await navigator.clipboard.writeText(`${window.location.origin}${path}`);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }}
    >
      {copied ? "Copiado!" : "Copiar link"}
    </Button>
  );
}
