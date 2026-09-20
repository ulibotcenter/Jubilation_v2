export { parseIrpfFile } from "@/lib/connectors/irpf/parse";
export { allowlistDirpfLines, persistIrpf } from "@/lib/connectors/irpf/allowlist";
export {
  suggestIrpfHoldings,
  applyIrpfHoldings,
  irpfAsOf,
} from "@/lib/connectors/irpf/map";
export {
  buildIrpfBatchPreview,
  applyIrpfBatchConfirm,
  extractTickerFromIrpfDescription,
  irpfCoveredByB3,
  largestIrpfRowId,
  retainIrpfExtract,
  type IrpfBatchPreview,
  type IrpfBatchRow,
} from "@/lib/connectors/irpf/preview";
export {
  IRPF_FIXTURE_DBK,
  IRPF_FIXTURE_CLINIC,
  IRPF_FIXTURE_DOCTOR,
  IRPF_FIXTURE_CPF,
  IRPF_FIXTURE_HOME_CENTS,
  IRPF_FIXTURE_PGBL_CENTS,
  IRPF_FIXTURE_PJ_CENTS,
  IRPF_FIXTURE_PREVPRIV_CENTS,
} from "@/lib/connectors/irpf/fixture";
export { DIRPF_LAYOUT_SOURCE, DIRPF_DISCARDED_RECORDS } from "@/lib/connectors/irpf/layout";
