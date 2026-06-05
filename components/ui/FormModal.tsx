"use client";

import { Plus } from "lucide-react";
import { Modal } from "./Modal";
import { Button } from "./Button";
import { SubmitButton } from "./SubmitButton";

/**
 * Reusable "Add / Edit" dialog used across every section. Pass a server action
 * and the form fields as children; the dialog closes once the action resolves.
 */
export function FormModal({
  title,
  triggerLabel = "Add",
  submitLabel = "Save",
  action,
  children,
  triggerVariant = "primary",
  triggerSize = "sm",
  showIcon = true,
}: {
  title: string;
  triggerLabel?: string;
  submitLabel?: string;
  action: (formData: FormData) => Promise<void> | Promise<unknown>;
  children: React.ReactNode;
  triggerVariant?: "primary" | "secondary" | "outline" | "ghost";
  triggerSize?: "sm" | "md";
  showIcon?: boolean;
}) {
  return (
    <Modal
      title={title}
      trigger={(open) => (
        <Button variant={triggerVariant} size={triggerSize} onClick={open}>
          {showIcon ? <Plus className="size-4" /> : null}
          {triggerLabel}
        </Button>
      )}
    >
      {(close) => (
        <form
          action={async (fd) => {
            await action(fd);
            close();
          }}
          className="space-y-3"
        >
          {children}
          <div className="flex justify-end pt-1">
            <SubmitButton>{submitLabel}</SubmitButton>
          </div>
        </form>
      )}
    </Modal>
  );
}
