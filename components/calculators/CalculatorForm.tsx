import type { ReactNode } from "react";
import { LiveNumberInput } from "@/components/calculators/LiveNumberInput";

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
  /** Width gauges so a bare input matches suffixed inputs. Not read aloud. */
  matchSuffixes?: readonly string[];
  className?: string;
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
  matchSuffixes,
  className,
}: NumberFieldProps) {
  const controlled = value != null && onValueChange != null;
  const gauges = (matchSuffixes ?? []).filter((item) => item.length > 0);
  const reserveOnly = !suffix && gauges.length > 0;
  return (
    <label
      className={`public-field${className ? ` ${className}` : ""}`}
    >
      <span className="public-field-label">{label}</span>
      <span className="public-field-control">
        {controlled ? (
          <LiveNumberInput
            name={name}
            value={value}
            onValueChange={onValueChange}
            min={min}
            max={max}
          />
        ) : (
          <input
            type="number"
            name={name}
            min={min}
            max={max}
            step={step}
            inputMode="decimal"
            required
            defaultValue={defaultValue}
          />
        )}
        {suffix || gauges.length > 0 ? (
          <span
            className={`public-field-suffix${reserveOnly ? " public-field-suffix--reserve" : ""}`}
            {...(reserveOnly ? { "aria-hidden": true as const } : {})}
          >
            {gauges.length > 0 ? (
              <>
                <span className="public-field-suffix-gauge" aria-hidden="true">
                  {gauges.map((gauge) => (
                    <span key={gauge}>{gauge}</span>
                  ))}
                </span>
                {suffix ? (
                  <span className="public-field-suffix-value">{suffix}</span>
                ) : null}
              </>
            ) : (
              suffix
            )}
          </span>
        ) : null}
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
  className,
  onSubmit,
}: {
  children: ReactNode;
  submitLabel?: string;
  className?: string;
  onSubmit?: () => void;
}) {
  return (
    <form
      method="get"
      className={`public-form card-surface${className ? ` ${className}` : ""}`}
      onSubmit={(event) => {
        if (!onSubmit) return;
        event.preventDefault();
        onSubmit();
      }}
    >
      <div className="public-form-grid">{children}</div>
      <button type="submit" className="btn-primary">
        {submitLabel}
      </button>
    </form>
  );
}
