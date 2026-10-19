import React from "react";
import { Button } from "../ui/Button.js";
import { FolderSearch } from "lucide-react";

export interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  actionLabel,
  onAction,
}) => {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border bg-card/40 px-6 py-12 text-center">
      <div className="flex h-10 w-10 items-center justify-center rounded-md border border-border bg-muted/50 text-muted-foreground mb-3.5">
        {icon || <FolderSearch className="h-5 w-5" />}
      </div>
      <h4 className="text-sm font-semibold text-foreground tracking-tight">{title}</h4>
      <p className="mt-1 max-w-sm text-xs text-muted-foreground leading-relaxed">
        {description}
      </p>
      {actionLabel && onAction && (
        <div className="mt-4">
          <Button size="sm" onClick={onAction}>
            {actionLabel}
          </Button>
        </div>
      )}
    </div>
  );
};

