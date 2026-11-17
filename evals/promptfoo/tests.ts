import { loadCases } from '../cases/case-schema'

// Testfaelle fuer evals/promptfooconfig.yaml: dieselben 10 Gold-Faelle wie
// run-eval.ts (evals/cases/*.json). Der ganze Fall geht als Objekt in
// vars.caseData; ein Objekt wird von promptfoo nicht ausmultipliziert
// (nur Arrays auf oberster Ebene).
export default function generateTests() {
  return loadCases().map(tc => ({
    description: tc.id,
    vars: { caseId: tc.id, caseData: tc },
  }))
}
