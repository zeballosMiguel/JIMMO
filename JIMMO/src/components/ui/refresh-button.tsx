"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface RefreshButtonProps {
  className?: string;
}

export function RefreshButton({ className }: RefreshButtonProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const handleRefresh = () => {
    startTransition(() => {
      router.refresh();
    });
  };

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={handleRefresh}
      disabled={isPending}
      title="Recargar datos"
      aria-label="Recargar datos"
      className={`h-8 w-8 text-muted-foreground hover:text-foreground transition-colors ${className ?? ""}`}
    >
      <RefreshCw className={`w-4 h-4 ${isPending ? "animate-spin text-primary" : ""}`} />
    </Button>
  );
}
