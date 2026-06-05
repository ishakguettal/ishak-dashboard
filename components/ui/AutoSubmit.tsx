"use client";

import { Select } from "./Field";

/** A <select> that submits its enclosing form on change (no Save button). */
export function AutoSubmitSelect(
  props: React.SelectHTMLAttributes<HTMLSelectElement>,
) {
  return (
    <Select
      {...props}
      onChange={(e) => e.currentTarget.form?.requestSubmit()}
    />
  );
}
