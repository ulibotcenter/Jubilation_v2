"use client";

import { useEffect, useRef } from "react";
import {
  commitNumericInput,
  numericTextForExternalValue,
} from "@/lib/calculators/numericInput";

/**
 * Number field that can be truly empty.
 * The input stays uncontrolled so a locale decimal mark is not wiped by
 * rewriting the value on each keystroke. The parent number is updated only
 * for a finished number. A slider (or any other parent change) still fills
 * the field when that number actually changes.
 * `step="any"` keeps slider increments off the typed field so Chrome does
 * not reject ordinary integers (35414) or default rates via step mismatch.
 */
export function LiveNumberInput({
  name,
  value,
  onValueChange,
  min,
  max,
}: {
  name: string;
  value: number;
  onValueChange: (value: number) => void;
  min?: number;
  max?: number;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const committed = useRef(value);

  useEffect(() => {
    const text = numericTextForExternalValue(committed.current, value);
    if (text == null) return;
    committed.current = value;
    const el = ref.current;
    if (!el) return;
    el.value = text;
  }, [value]);

  return (
    <input
      ref={ref}
      type="number"
      name={name}
      min={min}
      max={max}
      step="any"
      inputMode="decimal"
      required
      defaultValue={Number.isFinite(value) ? value : undefined}
      onChange={(event) => {
        const next = commitNumericInput(event.target.value);
        if (next == null) return;
        committed.current = next;
        onValueChange(next);
      }}
    />
  );
}
