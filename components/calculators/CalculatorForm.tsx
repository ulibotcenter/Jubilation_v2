import type { ReactNode } from "react";

interface NumberFieldProps {
  name: string;
  label: string;
  hint?: string;
  defaultValue: number;
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
  min,
  max,
  step = 1,
  suffix,
}: NumberFieldProps) {
  return (
    <label className="public-field">
      <span className="public-field-label">{label}</span>
      <span className="public-field-control">
        <input
          type="number"
          name={name}
          defaultValue={defaultValue}
          min={min}
          max={max}
          step={step}
          inputMode="decimal"
          required
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
