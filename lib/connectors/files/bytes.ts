/** Latin-1 / UTF-8 decoding for files the titular exported. Never logs the bytes. */

export function isPdfBytes(bytes: Uint8Array): boolean {
  return (
    bytes.length >= 5 &&
    bytes[0] === 0x25 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x44 &&
    bytes[3] === 0x46 &&
    bytes[4] === 0x2d
  );
}

export function looksEncryptedOrBinary(bytes: Uint8Array): boolean {
  if (isPdfBytes(bytes)) return false;
  if (bytes.length === 0) return true;
  let odd = 0;
  const sample = bytes.subarray(0, Math.min(bytes.length, 512));
  for (const b of sample) {
    if (b === 0) odd += 3;
    else if (b < 9 || (b > 13 && b < 32)) odd += 1;
  }
  return odd / sample.length > 0.25;
}

export function decodeTextFile(bytes: Uint8Array): string {
  if (isPdfBytes(bytes)) return extractPdfText(bytes);
  const utf8 = new TextDecoder("utf-8", { fatal: false }).decode(bytes);
  if (!utf8.includes("\uFFFD")) return stripBom(utf8);
  return stripBom(new TextDecoder("latin1").decode(bytes));
}

function stripBom(text: string): string {
  return text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
}

/**
 * Best-effort text from a simple uncompressed PDF (literal strings in Tj/TJ).
 * Compressed-only PDFs return empty; the caller should accept .txt/.csv too.
 */
export function extractPdfText(bytes: Uint8Array): string {
  const raw = new TextDecoder("latin1").decode(bytes);
  const chunks: string[] = [];
  const tj = /\((?:\\.|[^\\)])*\)\s*Tj/g;
  let match: RegExpExecArray | null;
  while ((match = tj.exec(raw))) {
    chunks.push(unescapePdfString(match[0].slice(1, match[0].lastIndexOf(")"))));
  }
  const arrayRe = /\[([\s\S]*?)\]\s*TJ/g;
  while ((match = arrayRe.exec(raw))) {
    const inner = match[1];
    const strRe = /\((?:\\.|[^\\)])*\)/g;
    let s: RegExpExecArray | null;
    while ((s = strRe.exec(inner))) {
      chunks.push(unescapePdfString(s[0].slice(1, -1)));
    }
  }
  return chunks.join("\n");
}

function unescapePdfString(value: string): string {
  return value
    .replace(/\\n/g, "\n")
    .replace(/\\r/g, "\r")
    .replace(/\\t/g, "\t")
    .replace(/\\\(/g, "(")
    .replace(/\\\)/g, ")")
    .replace(/\\\\/g, "\\");
}

export function buildUncompressedPdf(lines: string[]): Uint8Array {
  const escaped = lines.map((line) =>
    line.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)")
  );
  const ops = escaped
    .map((line, i) =>
      i === 0
        ? `BT /F1 10 Tf 36 760 Td (${line}) Tj`
        : `0 -12 Td (${line}) Tj`
    )
    .concat(["ET"])
    .join("\n");
  const stream = `${ops}\n`;
  const objects = [
    "1 0 obj<< /Type /Catalog /Pages 2 0 R >>endobj\n",
    "2 0 obj<< /Type /Pages /Kids [3 0 R] /Count 1 >>endobj\n",
    "3 0 obj<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>endobj\n",
    `4 0 obj<< /Length ${stream.length} >>stream\n${stream}endstream\nendobj\n`,
    "5 0 obj<< /Type /Font /Subtype /Type1 /BaseFont /Courier >>endobj\n",
  ];
  let body = "%PDF-1.1\n";
  const offsets = [0];
  for (const obj of objects) {
    offsets.push(body.length);
    body += obj;
  }
  const xrefStart = body.length;
  let xref = `xref\n0 6\n0000000000 65535 f \n`;
  for (let i = 1; i <= 5; i++) {
    xref += `${String(offsets[i]).padStart(10, "0")} 00000 n \n`;
  }
  body += `${xref}trailer<< /Size 6 /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF\n`;
  return new TextEncoder().encode(body);
}
