"use client";

import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export function ToastDemo() {
  return (
    <div className="flex flex-wrap gap-2">
      <Button
        variant="outline"
        size="sm"
        onClick={() => toast.success("Curso salvo.")}
      >
        Toast de sucesso
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={() => toast.error("Não foi possível excluir o campus.")}
      >
        Toast de erro
      </Button>
    </div>
  );
}
