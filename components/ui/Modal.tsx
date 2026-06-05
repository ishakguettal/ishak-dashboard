"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";

/**
 * Lightweight modal. `trigger` receives an `open` fn; `children` receives a
 * `close` fn so forms can dismiss the dialog after submitting.
 */
export function Modal({
  trigger,
  title,
  children,
}: {
  trigger: (open: () => void) => React.ReactNode;
  title?: string;
  children: (close: () => void) => React.ReactNode;
}) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    if (open) {
      document.addEventListener("keydown", onKey);
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <>
      {trigger(() => setOpen(true))}
      {open ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />
          <div className="relative z-10 max-h-[90vh] w-full overflow-y-auto rounded-t-2xl border border-border bg-surface p-5 sm:max-w-md sm:rounded-card">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-base font-semibold">{title}</h3>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="text-muted transition-colors hover:text-text"
                aria-label="Close"
              >
                <X className="size-5" />
              </button>
            </div>
            {children(() => setOpen(false))}
          </div>
        </div>
      ) : null}
    </>
  );
}
