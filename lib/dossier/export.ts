export type ExportDocument = {
  type: string;
  title: string;
  content: string | null;
};

export type ExportProject = {
  title: string;
  genre: string | null;
  duration_minutes: string | number | null;
  country: string | null;
  language: string | null;
  theme: string | null;
  target_audience: string | null;
  logline: string | null;
};

export type ExportPackage = {
  label: string;
  requiredDocuments: string[];
  optionalDocuments: string[];
};

const LABELS: Record<string, string> = {
  synopsis: "Synopsis",
  intent_note: "Note d’intention",
  director_note: "Note de réalisation",
  production_schedule: "Planning de production",
  budget: "Budget",
  financing_plan: "Plan de financement",
  pitch_deck: "Pitch deck",
  bible: "Bible",
  scenario: "Scénario",
  technical_breakdown: "Dépouillement technique",
};

const ORDER = [["synopsis", "Synopsis"], ["intent_note", "Note d’intention"], ["director_note", "Note de réalisation"], ["production_schedule", "Planning de production"], ["budget", "Budget"], ["financing_plan", "Plan de financement"], ["pitch_deck", "Pitch deck"]] as const;

function escapeHtml(value: string) { return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\"/g, "&quot;"); }
function formatContent(value: string) { return escapeHtml(value.trim()).split(/\n\s*\n/).map((paragraph) => `<p>${paragraph.replace(/\n/g, "<br />")}</p>`).join(""); }

function packageOrder(pack: ExportPackage) {
  return [...pack.requiredDocuments, ...pack.optionalDocuments.filter((type) => !pack.requiredDocuments.includes(type))];
}

function buildOrder(pack?: ExportPackage) {
  if (!pack) return ORDER as readonly (readonly [string, string])[];
  return packageOrder(pack).map((type) => [type, LABELS[type] ?? type] as [string, string]);
}

export function buildDossierHtml(project: ExportProject, documents: ExportDocument[], generatedAt = new Date()) {
  return buildPackageHtml({ label: "Dossier de financement", requiredDocuments: ORDER.map(([type]) => type), optionalDocuments: [] }, project, documents, generatedAt);
}

export function buildPackageHtml(pack: ExportPackage, project: ExportProject, documents: ExportDocument[], generatedAt = new Date()) {
  const byType = new Map(documents.map((doc) => [doc.type, doc]));
  const metadata = [project.genre, project.duration_minutes ? `${project.duration_minutes} min` : null, project.country, project.language].filter(Boolean).join(" · ");
  const sections = buildOrder(pack).map(([type, label]) => { const doc = byType.get(type); if (!doc?.content?.trim()) return ""; return `<section class="document"><div class="eyebrow">FILMFUND AFRICA</div><h2>${escapeHtml(label)}</h2>${formatContent(doc.content)}</section>`; }).join("");
  return `<!doctype html><html lang="fr"><head><meta charset="utf-8"/><title>${escapeHtml(project.title)} — ${escapeHtml(pack.label)}</title><style>@page{size:A4;margin:18mm 17mm 20mm}*{box-sizing:border-box}body{margin:0;font-family:Arial,Helvetica,sans-serif;color:#171717;font-size:11pt;line-height:1.65}.cover{min-height:250mm;display:flex;flex-direction:column;justify-content:space-between;padding:22mm 8mm}.brand{letter-spacing:.22em;font-size:10pt;font-weight:700}.gold{color:#9a6c21}.cover h1{font-family:Georgia,serif;font-size:38pt;line-height:1.08;margin:0 0 10mm}.logline{font-size:15pt;max-width:150mm;color:#444}.meta{color:#777;font-size:10pt}.document{page-break-before:always}.eyebrow{color:#9a6c21;font-size:8pt;font-weight:700;letter-spacing:.18em;margin-bottom:4mm}.document h2{font-family:Georgia,serif;font-size:24pt;line-height:1.15;border-bottom:1px solid #ddd;padding-bottom:5mm;margin:0 0 9mm}.document p{margin:0 0 6mm;white-space:normal}footer{position:fixed;bottom:6mm;left:0;right:0;text-align:center;font-size:8pt;color:#888}</style></head><body><main class="cover"><div><div class="brand gold">FILMFUND AFRICA</div><div class="meta" style="margin-top:5mm">${escapeHtml(pack.label.toUpperCase())}</div></div><div><h1>${escapeHtml(project.title)}</h1><div class="logline">${escapeHtml(project.logline || "Projet audiovisuel")}</div><div class="meta" style="margin-top:8mm">${escapeHtml(metadata || "Projet audiovisuel")}</div></div><div class="meta">Document généré le ${generatedAt.toLocaleDateString("fr-FR")}</div></main>${sections}<footer>FILMFUND AFRICA · ${escapeHtml(pack.label)}</footer></body></html>`;
}

const PAGE_W = 595, PAGE_H = 842, LEFT = 58, TOP = 785, BOTTOM = 58, MAX_CHARS = 88;
function pdfText(value: string) { return value.normalize("NFC").replace(/[\u2018\u2019]/g, "'").replace(/[\u201C\u201D]/g, '"').replace(/–|—/g, "-").replace(/…/g, "...").replace(/[^\x20-\xFF]/g, "?").replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)"); }
function wrap(value: string, max = MAX_CHARS) { const words = value.trim().split(/\s+/).filter(Boolean); const lines: string[] = []; let line = ""; for (const word of words) { const next = line ? `${line} ${word}` : word; if (next.length <= max) line = next; else { if (line) lines.push(line); line = word; } } if (line) lines.push(line); return lines; }

function buildPdfPages(project: ExportProject, documents: ExportDocument[], generatedAt: Date, pack?: ExportPackage) {
  const byType = new Map(documents.map((doc) => [doc.type, doc])); const pages: string[][] = [];
  const cover: string[] = ["BT", "/F1 9 Tf", "58 780 Td", "(FILMFUND AFRICA) Tj", "/F2 30 Tf", "0 -75 Td", `(${pdfText(project.title)}) Tj`, "/F1 13 Tf", "0 -34 Td"];
  for (const line of wrap(project.logline || "Projet audiovisuel", 62)) cover.push(`(${pdfText(line)}) Tj`, "0 -19 Td");
  const meta = [project.genre, project.duration_minutes ? `${project.duration_minutes} min` : null, project.country, project.language].filter(Boolean).join(" · "); cover.push("/F1 9 Tf", "0 -30 Td", `(${pdfText(meta)}) Tj`, "0 -600 Td", `(${pdfText(`Généré le ${generatedAt.toLocaleDateString("fr-FR")}`)}) Tj`, "ET"); pages.push(cover);
  for (const [type, label] of buildOrder(pack)) {
    const doc = byType.get(type); if (!doc?.content?.trim()) continue;
    let commands: string[] = ["BT", "/F1 9 Tf", "58 790 Td", "(FILMFUND AFRICA) Tj", "/F2 24 Tf", "0 -42 Td", `(${pdfText(label)}) Tj`, "/F1 10 Tf", "0 -32 Td"]; let y = TOP - 42 - 32;
    const flush = () => { commands.push("ET"); pages.push(commands); commands = ["BT", "/F1 9 Tf", "58 785 Td", "/F1 10 Tf", "0 -15 Td"]; y = TOP - 15; };
    for (const paragraph of doc.content.split(/\n\s*\n/)) { for (const line of wrap(paragraph)) { if (y < BOTTOM) flush(); commands.push(`(${pdfText(line)}) Tj`, "0 -15 Td"); y -= 15; } if (y < BOTTOM) flush(); else { commands.push("0 -10 Td"); y -= 10; } }
    commands.push("ET"); pages.push(commands);
  }
  return pages;
}
function byteLength(value: string) { return new TextEncoder().encode(value).length; }

export function buildDossierPdf(project: ExportProject, documents: ExportDocument[], generatedAt = new Date()) {
  return buildPdf(project, documents, { label: "Dossier de financement", requiredDocuments: ORDER.map(([type]) => type), optionalDocuments: [] }, generatedAt);
}

export function buildPackagePdf(pack: ExportPackage, project: ExportProject, documents: ExportDocument[], generatedAt = new Date()) {
  return buildPdf(project, documents, pack, generatedAt);
}

function buildPdf(project: ExportProject, documents: ExportDocument[], pack: ExportPackage, generatedAt: Date) {
  const pages = buildPdfPages(project, documents, generatedAt, pack); const objects: string[] = [];
  objects.push("<< /Type /Catalog /Pages 2 0 R >>"); objects.push(`<< /Type /Pages /Kids [${pages.map((_, i) => `${5 + i * 2} 0 R`).join(" ")}] /Count ${pages.length} >>`); objects.push("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>"); objects.push("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>");
  pages.forEach((commands, i) => { const stream = commands.join("\n"); objects.push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE_W} ${PAGE_H}] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${6 + i * 2} 0 R >>`); objects.push(`<< /Length ${byteLength(stream)} >>\nstream\n${stream}\nendstream`); });
  let pdf = "%PDF-1.4\n%\xFF\xFF\xFF\xFF\n"; const offsets = [0]; objects.forEach((object, index) => { offsets.push(byteLength(pdf)); pdf += `${index + 1} 0 obj\n${object}\nendobj\n`; });
  const xref = byteLength(pdf); pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`; for (let i = 1; i < offsets.length; i++) pdf += `${String(offsets[i]).padStart(10, "0")} 00000 n \n`; pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return new TextEncoder().encode(pdf);
}
