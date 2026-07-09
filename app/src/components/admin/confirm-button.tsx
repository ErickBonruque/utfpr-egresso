"use client";

import { useTransition } from "react";
import type { FormActionResult } from "@/components/admin/form-dialog";
import { Button } from "@/components/ui/button";

/// Button for destructive/irreversible actions: native confirm() before
/// calling the (pre-bound) server action; expected errors come back as
/// { error } and are alerted.
export function ConfirmButton({
  action,
  confirmMessage,
  children,
  variant = "outline",
  size = "sm",
}: {
  action: () => Promise<FormActionResult>;
  confirmMessage: string;
  children: React.ReactNode;
  variant?: React.ComponentProps<typeof Button>["variant"];
  size?: React.ComponentProps<typeof Button>["size"];
}) {
  const [pending, startTransition] = useTransition();

  return (
    <Button
      type="button"
      variant={variant}
      size={size}
      disabled={pending}
      onClick={() => {
        if (!window.confirm(confirmMessage)) return;
        startTransition(async () => {
          const result = await action();
          if (result?.error) window.alert(result.error);
        });
      }}
    >
      {children}
    </Button>
  );
}
