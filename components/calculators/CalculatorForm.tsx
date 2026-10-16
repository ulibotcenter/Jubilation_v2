import type { ChangeEvent, ReactNode } from "react";

interface NumberFieldProps {
  name: string;
  label: string;
  hint?: string;
  defaultValue?: number;
  value?: number;
  onValueChange?: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  suffix?: string;
}

export function NumberField({
  name,
  label,
  hint,
  defaultValue,
  value,
  onValueChange,
  min,
  max,
  step = 1,
  suffix,
}: NumberFieldProps) {
  const controlled = value != null && onValueChange != null;
  return (
    <label className="public-field">
      <span className="public-field-label">{label}</span>
      <span className="public-field-control">
        <input
          type="number"
          name={name}
          min={min}
          max={max}
          step={step}
          inputMode="decimal"
          required
          {...(controlled
            ? {
                value,
                onChange: (event: ChangeEvent<HTMLInputElement>) => {
                  const raw = event.target.value;
                  if (raw === "") {
                    onValueChange(0);
                    return;
                  }
                  const next = Number(raw);
                  if (Number.isFinite(next)) onValueChange(next);
                },
              }
            : { defaultValue })}
        />
        {suffix ? <span className="public-field-suffix">{suffix}</span> : null}
      </span>
      {hint ? <span className="public-field-hint">{hint}</span> : null}
    </label>
  );
}

export function SelectField({
  name,
  label,
  hint,
  defaultValue,
  children,
}: {
  name: string;
  label: string;
  hint?: string;
  defaultValue: string;
  children: ReactNode;
}) {
  return (
    <label className="public-field">
      <span className="public-field-label">{label}</span>
      <span className="public-field-control">
        <select name={name} defaultValue={defaultValue}>
          {children}
        </select>
      </span>
      {hint ? <span className="public-field-hint">{hint}</span> : null}
    </label>
  );
}

export function CalculatorForm({
  children,
  submitLabel = "Atualizar simulação",
}: {
  children: ReactNode;
  submitLabel?: string;
}) {
  return (
    <form method="get" className="public-form card-surface">
      <div className="public-form-grid">{children}</div>
      <button type="submit" className="btn-primary">
        {submitLabel}
      </button>
    </form>
  );
}
