function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function csvEscape(val: string): string {
  if (val.includes(",") || val.includes('"') || val.includes("\n")) {
    return `"${val.replace(/"/g, '""')}"`;
  }
  return val;
}

export function downloadCSVFile(headers: string[], rows: string[][], filename: string) {
  const csv =
    headers.map(csvEscape).join(",") +
    "\n" +
    rows.map((r) => r.map(csvEscape).join(",")).join("\n");
  const blob = new Blob(["\ufeff" + csv], {
    type: "text/csv;charset=utf-8;",
  });
  triggerDownload(blob, filename + ".csv");
}

export function downloadXLSFile(headers: string[], rows: string[][], filename: string) {
  let html =
    '<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel"><head><meta charset="utf-8"><!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet><x:Name>Datos</x:Name><x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions></x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]--></head><body><table>';
  html +=
    "<tr>" +
    headers
      .map(
        (h) =>
          `<th style="font-weight:bold;background:#f0f0f0">${esc(h)}</th>`
      )
      .join("") +
    "</tr>";
  for (const row of rows) {
    html +=
      "<tr>" + row.map((c) => `<td>${esc(c)}</td>`).join("") + "</tr>";
  }
  html += "</table></body></html>";
  const blob = new Blob(["\ufeff" + html], {
    type: "application/vnd.ms-excel;charset=utf-8",
  });
  triggerDownload(blob, filename + ".xls");
}

export function downloadPDFFile(
  title: string,
  headers: string[],
  rows: string[][]
) {
  const win = window.open("", "_blank");
  if (!win) {
    alert("Permite ventanas emergentes para descargar PDF");
    return;
  }
  let html = `<!DOCTYPE html><html><head><title>${esc(title)}</title><style>
    body{font-family:Arial,sans-serif;padding:20px;font-size:11px}
    h1{font-size:16px;margin-bottom:4px}
    .meta{color:#666;font-size:10px;margin-bottom:12px}
    table{width:100%;border-collapse:collapse}
    th,td{border:1px solid #ccc;padding:4px 6px;text-align:left}
    th{background:#f5f5f5;font-weight:bold;font-size:10px}
    @media print{body{padding:0}}
  </style></head><body>`;
  html += `<h1>${esc(title)}</h1>`;
  html += `<div class="meta">Generado: ${new Date().toLocaleDateString("es-BO")} · ${rows.length} registros</div>`;
  html +=
    "<table><thead><tr>" +
    headers.map((h) => `<th>${esc(h)}</th>`).join("") +
    "</tr></thead><tbody>";
  for (const row of rows) {
    html +=
      "<tr>" + row.map((c) => `<td>${esc(c)}</td>`).join("") + "</tr>";
  }
  html += "</tbody></table></body></html>";
  win.document.write(html);
  win.document.close();
  setTimeout(() => win.print(), 500);
}
