export { parseCnisFile } from "@/lib/connectors/cnis/parse";
export { mapCnisToInssPerson, competencesForEngine } from "@/lib/connectors/cnis/map";
export {
  CNIS_FIXTURE_TEXT,
  CNIS_FIXTURE_CSV,
  CNIS_FIXTURE_AS_OF,
  CNIS_FIXTURE_SB_CENTS,
  CNIS_FIXTURE_SB_MONTHS,
  CNIS_FIXTURE_TC_MONTHS,
  CNIS_FIXTURE_ESPECIAL_MONTHS,
  CNIS_FIXTURE_RURAL_MONTHS,
  CNIS_FIXTURE_CONCURRENT_MONTHS,
  cnisFixturePdf,
} from "@/lib/connectors/cnis/fixture";
export type { CnisExtract, CnisParseResult, CnisVinculo, CnisCompetence } from "@/lib/connectors/cnis/types";
