import {
  AlignmentType,
  Document,
  HeadingLevel,
  Packer,
  Paragraph,
  TextRun,
} from "docx";

import type { ExportDocument, ExportPackage, ExportProject } from "./export";

const ORDER = [
  ["synopsis", "Synopsis"],
  ["intent_note", "Note d’intention"],
  ["director_note", "Note de réalisation"],
  ["production_schedule", "Planning de production"],
  ["budget", "Budget"],
  ["financing_plan", "Plan de financement"],
  ["pitch_deck", "Pitch deck"],
] as const;

const LABELS: Record<string, string> = Object.fromEntries(ORDER);

function orderFor(pack?: ExportPackage) {
  if (!pack) return ORDER as readonly (readonly [string, string])[];
  return [...pack.requiredDocuments, ...pack.optionalDocuments.filter((type) => !pack.requiredDocuments.includes(type))]
    .map((type) => [type, LABELS[type] ?? type] as [string, string]);
}

export async function buildDossierDocx(project: ExportProject, documents: ExportDocument[], generatedAt = new Date()) {
  return buildPackageDocx(
    { label: "Dossier de financement", requiredDocuments: ORDER.map(([type]) => type), optionalDocuments: [] },
    project,
    documents,
    generatedAt,
  );
}

export async function buildPackageDocx(pack: ExportPackage, project: ExportProject, documents: ExportDocument[], generatedAt = new Date()) {
  const byType = new Map(documents.map((doc) => [doc.type, doc]));
  const metadata = [
    project.genre,
    project.duration_minutes ? `${project.duration_minutes} min` : null,
    project.country,
    project.language,
  ].filter(Boolean).join(" · ");

  const children: Paragraph[] = [
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 240 },
      children: [new TextRun({ text: "FILMFUND AFRICA", bold: true, color: "9A6C21", characterSpacing: 80 })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      heading: HeadingLevel.TITLE,
      children: [new TextRun({ text: project.title })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 160 },
      children: [new TextRun({ text: project.logline || "Projet audiovisuel", italics: true, size: 28 })],
    }),
    new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: metadata || "Projet audiovisuel", color: "777777" })] }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 500, after: 700 },
      children: [new TextRun({ text: `Document généré le ${generatedAt.toLocaleDateString("fr-FR")}`, color: "777777" })],
    }),
  ];

  for (const [type, label] of orderFor(pack)) {
    const doc = byType.get(type);
    if (!doc?.content?.trim()) continue;
    children.push(new Paragraph({ heading: HeadingLevel.HEADING_1, pageBreakBefore: true, children: [new TextRun({ text: label, color: "9A6C21" })] }));
    for (const paragraph of doc.content.split(/\n\s*\n/)) {
      if (!paragraph.trim()) continue;
      children.push(new Paragraph({
        spacing: { after: 180, line: 280 },
        children: paragraph.split("\n").flatMap((line, index) => index === 0 ? [new TextRun({ text: line })] : [new TextRun({ break: 1 }), new TextRun({ text: line })]),
      }));
    }
  }

  const document = new Document({
    creator: "FILMFUND AFRICA",
    title: `${project.title} — ${pack.label}`,
    description: `Package ${pack.label} généré par FILMFUND AFRICA`,
    sections: [{ properties: {}, children }],
  });

  return Packer.toBuffer(document);
}
