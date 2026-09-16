import { getFundingPackage, type FundingPackageId } from "./funding-packages";
import { validateDossier, type DossierCheck, type DossierDocument } from "./dossier-validator";

export type PackageValidation = {
  packageId: FundingPackageId;
  packageLabel: string;
  ready: boolean;
  completion: number;
  missing: string[];
  checks: DossierCheck[];
  summary: string;
  checkedAt: string;
};

export function validateFundingPackage(documents: DossierDocument[], packageId: string): PackageValidation {
  const pack = getFundingPackage(packageId);
  if (!pack) throw new Error("Package de financement inconnu.");

  const base = validateDossier(documents, pack.requiredDocuments);
  const present = pack.requiredDocuments.filter((type) => !base.checks.some((check) => check.code === `missing_${type}`));
  const missing = pack.requiredDocuments.filter((type) => !present.includes(type));
  const completion = pack.requiredDocuments.length === 0 ? 100 : Math.round((present.length / pack.requiredDocuments.length) * 100);

  return {
    packageId: pack.id,
    packageLabel: pack.label,
    ready: base.ready,
    completion,
    missing,
    checks: base.checks,
    summary: base.ready
      ? `Le package « ${pack.label} » passe les contrôles automatiques.`
      : `${base.summary} Package concerné : ${pack.label}.`,
    checkedAt: base.checkedAt,
  };
}
