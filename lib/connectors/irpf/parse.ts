import { allowlistDirpfLines, persistIrpf, type IrpfAllowlisted } from "@/lib/connectors/irpf/allowlist";
import { decodeTextFile, looksEncryptedOrBinary, isPdfBytes } from "@/lib/connectors/files/bytes";
import { DIRPF_LAYOUT_SOURCE } from "@/lib/connectors/irpf/layout";

export interface IrpfParseResult {
  allowlisted: IrpfAllowlisted;
  persisted: Record<string, unknown>;
  layoutSource: string;
  format: "dbk" | "dec" | "pdf-text";
  warnings: string[];
}

export function parseIrpfFile(
  input: Uint8Array | string,
  options: { fileName?: string } = {}
): IrpfParseResult {
  const bytes =
    typeof input === "string" ? new TextEncoder().encode(input) : input;
  const name = (options.fileName ?? "").toLowerCase();
  if (looksEncryptedOrBinary(bytes) && !isPdfBytes(bytes)) {
    throw new Error(
      "IRPF file looks encrypted. Export an unlocked .DBK or the .DEC from the PGD."
    );
  }
  const text = typeof input === "string" ? input : decodeTextFile(bytes);
  const warnings: string[] = [];
  let format: IrpfParseResult["format"] = "dbk";
  if (name.endsWith(".dec")) format = "dec";
  if (name.endsWith(".pdf") || isPdfBytes(bytes)) {
    format = "pdf-text";
    warnings.push(
      "pdf-irpf-is-best-effort: this lot implements the published .DBK/.DEC layout; PDF Declaração Completa is parsed as extracted text if it contains DIRPF records, otherwise rejected."
    );
  }
  const lines = text.split(/\r?\n/);
  const hasRecords = lines.some((l) => {
    const t = l.slice(0, 8);
    return t.startsWith("IRPF") || /^(16|19|21|27)/.test(l);
  });
  if (!hasRecords) {
    throw new Error(
      "Not a DIRPF .DBK/.DEC (IRPF header / records 16–28). PDF without extractable records is not implemented in this lot."
    );
  }
  const allowlisted = allowlistDirpfLines(lines);
  return {
    allowlisted,
    persisted: persistIrpf(allowlisted),
    layoutSource: DIRPF_LAYOUT_SOURCE,
    format,
    warnings,
  };
}
