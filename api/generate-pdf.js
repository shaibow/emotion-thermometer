// Vercel serverless function — generates a styled PDF from form data
// NOTE: pdfkit only accepts hex strings ("#rrggbb") or plain color names,
//       NOT CSS "rgb()" strings. All colors here are hex.
const PDFDocument = require("pdfkit");

const ZONES = [
  { id: "red",    prefix: "r1", label: "Red",    bg: "#fef2f2", ink: "#991b1b", line: "#fca5a5" },
  { id: "orange", prefix: "o1", label: "Orange", bg: "#fff7ed", ink: "#9a3412", line: "#fdba74" },
  { id: "yellow", prefix: "y1", label: "Yellow", bg: "#fefce8", ink: "#854d0e", line: "#fde047" },
  { id: "green",  prefix: "g1", label: "Green",  bg: "#f0fdf4", ink: "#14532d", line: "#86efac" },
];

const COLUMNS = [
  { suffix: "feeling",  heading: "Feeling" },
  { suffix: "physical", heading: "Physical signals" },
  { suffix: "thoughts", heading: "Thoughts" },
  { suffix: "behavior", heading: "Behavior" },
  { suffix: "coping",   heading: "What can I do?" },
];

function formatDate(value) {
  if (!value) return "";
  const d = new Date(`${value}T00:00:00`);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}

function buildPDF(doc, data, activeZone) {
  // A4 landscape — more horizontal room for 6 columns
  const PW = 841.89;
  const PH = 595.28;
  const M  = 36;        // margin
  const CW = PW - 2 * M; // ~770pt content width

  const emotion = data.emotion === "Other"
    ? (data.emotionOther || "Other").trim()
    : (data.emotion || "").trim();
  const name        = (data.name || "").trim();
  const dateDisplay = formatDate(data.date);

  // ─── HEADER ──────────────────────────────────────────────────────────────
  let y = M;

  // Title
  doc.fillColor("#111827").font("Helvetica-Bold").fontSize(18)
     .text("Emotion Thermometer", M, y, { lineBreak: false });

  // Emotion badge — top right
  if (emotion) {
    doc.font("Helvetica-Bold").fontSize(10);
    const bw = doc.widthOfString(emotion) + 26;
    const bx = M + CW - bw;
    // Draw filled pill
    doc.roundedRect(bx, y - 2, bw, 22, 11).fill("#111827");
    // Badge text
    doc.fillColor("#ffffff")
       .text(emotion, bx, y + 4, { width: bw, align: "center", lineBreak: false });
  }

  y += 26;

  // Meta (name · date)
  const meta = [name, dateDisplay].filter(Boolean).join("   ·   ");
  if (meta) {
    doc.fillColor("#6b7280").font("Helvetica").fontSize(8)
       .text(meta, M, y, { lineBreak: false });
    y += 14;
  } else {
    y += 6;
  }

  // Divider
  y += 4;
  doc.moveTo(M, y).lineTo(M + CW, y).lineWidth(1.5).strokeColor("#111827").stroke();
  y += 10;

  // ─── TABLE ───────────────────────────────────────────────────────────────
  const ZONE_W  = 58;
  const FIELD_W = (CW - ZONE_W) / 5;  // ~142pt each
  const THEAD_H = 22;

  // Header bar
  doc.rect(M, y, CW, THEAD_H).fill("#111827");

  // Header column labels
  const headerCols = [
    { label: "Zone",             w: ZONE_W },
    ...COLUMNS.map((c) => ({ label: c.heading, w: FIELD_W })),
  ];
  doc.fillColor("#ffffff").font("Helvetica-Bold").fontSize(7);
  let hx = M;
  headerCols.forEach((col) => {
    // Left-pad 7pt inside each cell
    doc.text(col.label.toUpperCase(), hx + 7, y + 8, {
      width:     col.w - 10,
      lineBreak: false,
    });
    hx += col.w;
  });

  y += THEAD_H;

  // Rows: fill all remaining page height
  const TABLE_BOTTOM = PH - M - 16; // 16pt footer gap
  const ROW_H = Math.floor((TABLE_BOTTOM - y) / 4);

  ZONES.forEach((zone, zi) => {
    const ry       = y + zi * ROW_H;
    const isActive = zone.id === activeZone;

    // ── Zone label cell ────────────────────────────────────────────────────
    doc.rect(M, ry, ZONE_W, ROW_H).fill(zone.bg);

    // Colored left accent strip
    doc.rect(M, ry, 5, ROW_H).fill(zone.ink);

    // Zone name — vertically centred
    const nameY = ry + (ROW_H / 2) - 6;
    doc.fillColor(zone.ink).font("Helvetica-Bold").fontSize(9)
       .text(zone.label, M + 5, nameY, {
         width:     ZONE_W - 8,
         align:     "center",
         lineBreak: false,
       });

    // Small square dot for active zone
    if (isActive) {
      const dotY = nameY + 14;
      const dotX = M + ZONE_W / 2 - 3;
      doc.rect(dotX, dotY, 6, 6).fill(zone.ink);
    }

    // Right accent border on zone cell
    doc.moveTo(M + ZONE_W, ry)
       .lineTo(M + ZONE_W, ry + ROW_H)
       .lineWidth(2)
       .strokeColor(zone.line)
       .stroke();

    // ── Data cells ─────────────────────────────────────────────────────────
    let cx = M + ZONE_W;

    COLUMNS.forEach((col, ci) => {
      const val = (data[`${zone.prefix}-${col.suffix}`] || "").trim();

      // Cell background
      doc.rect(cx, ry, FIELD_W, ROW_H).fill(isActive ? "#f8fafc" : "#ffffff");

      // Cell text
      if (val) {
        doc.fillColor("#111827").font("Helvetica").fontSize(9)
           .text(val, cx + 8, ry + 8, {
             width:    FIELD_W - 16,
             height:   ROW_H - 16,
             ellipsis: true,
           });
      } else {
        doc.fillColor("#d1d5db").font("Helvetica").fontSize(9)
           .text("—", cx + 8, ry + 8, { lineBreak: false });
      }

      // Column divider (skip after last column)
      if (ci < 4) {
        doc.moveTo(cx + FIELD_W, ry)
           .lineTo(cx + FIELD_W, ry + ROW_H)
           .lineWidth(0.4)
           .strokeColor("#e5e7eb")
           .stroke();
      }

      cx += FIELD_W;
    });

    // Row bottom divider (skip after last row)
    if (zi < 3) {
      doc.moveTo(M, ry + ROW_H)
         .lineTo(M + CW, ry + ROW_H)
         .lineWidth(0.4)
         .strokeColor("#e5e7eb")
         .stroke();
    }
  });

  // Outer table border
  const tableTopY = y - THEAD_H;
  const tableH    = THEAD_H + ROW_H * 4;
  doc.rect(M, tableTopY, CW, tableH).lineWidth(0.8).strokeColor("#d1d5db").stroke();

  // ─── FOOTER ──────────────────────────────────────────────────────────────
  const footerY = PH - M - 4;
  doc.fillColor("#9ca3af").font("Helvetica").fontSize(7)
     .text("emotion-thermometer", M, footerY, { lineBreak: false });
  if (dateDisplay) {
    doc.text(dateDisplay, M, footerY, { width: CW, align: "right", lineBreak: false });
  }
}

module.exports = function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  try {
    const { data = {}, activeZone = "" } = req.body || {};

    // A4 landscape
    const doc    = new PDFDocument({ size: "A4", layout: "landscape", margin: 0, compress: true });
    const chunks = [];

    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => {
      const pdf = Buffer.concat(chunks);

      const emotionSlug = (data.emotion || "emotion")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 40) || "emotion";
      const dateSlug = data.date || new Date().toISOString().slice(0, 10);
      const filename = `thermometer-${emotionSlug}-${dateSlug}.pdf`;

      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
      res.setHeader("Content-Length", String(pdf.length));
      res.end(pdf);
    });

    buildPDF(doc, data, activeZone);
    doc.end();
  } catch (err) {
    console.error("PDF generation error:", err);
    if (!res.headersSent) {
      res.status(500).json({ error: "PDF generation failed", message: err.message });
    }
  }
};
