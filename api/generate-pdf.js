// Vercel serverless function — generates a styled PDF from form data
const PDFDocument = require("pdfkit");

const ZONES = [
  { id: "red",    prefix: "r1", label: "Red",    bg: [254, 242, 242], ink: [153, 27, 27],  line: [252, 165, 165] },
  { id: "orange", prefix: "o1", label: "Orange", bg: [255, 247, 237], ink: [154, 52, 18],  line: [253, 186, 116] },
  { id: "yellow", prefix: "y1", label: "Yellow", bg: [254, 252, 232], ink: [133, 77, 14],  line: [253, 224, 71]  },
  { id: "green",  prefix: "g1", label: "Green",  bg: [240, 253, 244], ink: [20, 83, 45],   line: [134, 239, 172] },
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
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function rgb(arr) {
  return `rgb(${arr[0]},${arr[1]},${arr[2]})`;
}

function buildPDF(doc, data, activeZone) {
  const M   = 36;
  const PW  = 595.28;
  const PH  = 841.89;
  const CW  = PW - 2 * M;

  const emotion = data.emotion === "Other"
    ? (data.emotionOther || "Other").trim()
    : (data.emotion || "").trim();
  const name        = (data.name || "").trim();
  const dateDisplay = formatDate(data.date);

  // ─── HEADER ────────────────────────────────────────────────────────────────
  let y = M;

  // Title
  doc.fillColor("#111827").font("Helvetica-Bold").fontSize(20)
     .text("Emotion Thermometer", M, y, { lineBreak: false });

  // Emotion badge (top-right)
  if (emotion) {
    doc.fontSize(10).font("Helvetica-Bold");
    const bw  = doc.widthOfString(emotion) + 22;
    const bx  = M + CW - bw;
    const bh  = 20;
    const by  = y + 1;
    doc.roundedRect(bx, by, bw, bh, 10).fill("#111827");
    doc.fillColor("#ffffff")
       .text(emotion, bx, by + 5, { width: bw, align: "center", lineBreak: false });
  }

  y += 28;

  // Meta line
  const meta = [name, dateDisplay].filter(Boolean).join("  ·  ");
  if (meta) {
    doc.fillColor("#6b7280").font("Helvetica").fontSize(8.5)
       .text(meta, M, y, { lineBreak: false });
    y += 14;
  } else {
    y += 4;
  }

  // Divider
  y += 4;
  doc.moveTo(M, y).lineTo(M + CW, y).lineWidth(1.5).strokeColor("#111827").stroke();
  y += 10;

  // ─── TABLE ─────────────────────────────────────────────────────────────────
  const ZONE_W   = 52;
  const FIELD_W  = (CW - ZONE_W) / 5;
  const THEAD_H  = 20;

  // Header row background
  doc.rect(M, y, CW, THEAD_H).fill("#111827");

  // Header labels
  const allCols = [
    { heading: "Zone", w: ZONE_W },
    ...COLUMNS.map((c) => ({ heading: c.heading, w: FIELD_W })),
  ];
  let hx = M + 5;
  doc.fillColor("#ffffff").font("Helvetica-Bold").fontSize(6.5);
  allCols.forEach((col) => {
    doc.text(col.heading.toUpperCase(), hx, y + 7, { width: col.w - 8, lineBreak: false });
    hx += col.w;
  });

  y += THEAD_H;

  // Data rows — fill all available vertical space
  const tableBottom = PH - M - 18; // leave room for footer
  const ROW_H = Math.floor((tableBottom - y) / 4);

  ZONES.forEach((zone, zi) => {
    const ry       = y + zi * ROW_H;
    const isActive = zone.id === activeZone;

    // Zone label cell
    doc.rect(M, ry, ZONE_W, ROW_H).fill(rgb(zone.bg));

    // Zone label text (vertically centred)
    const labelY = ry + ROW_H / 2 - 5;
    doc.fillColor(rgb(zone.ink)).font("Helvetica-Bold").fontSize(8.5)
       .text(zone.label, M, labelY, { width: ZONE_W, align: "center", lineBreak: false });

    // Active-zone dot
    if (isActive) {
      doc.circle(M + ZONE_W / 2, ry + ROW_H / 2 + 9, 3).fill(rgb(zone.ink));
    }

    // Zone right-border accent
    doc.moveTo(M + ZONE_W, ry).lineTo(M + ZONE_W, ry + ROW_H)
       .lineWidth(2).strokeColor(rgb(zone.line)).stroke();

    // Data cells
    let cx = M + ZONE_W;
    COLUMNS.forEach((col, ci) => {
      const val = (data[`${zone.prefix}-${col.suffix}`] || "").trim();

      doc.rect(cx, ry, FIELD_W, ROW_H)
         .fill(isActive ? "#f9fafb" : "#ffffff");

      if (val) {
        doc.fillColor("#111827").font("Helvetica").fontSize(8.5)
           .text(val, cx + 6, ry + 7, {
             width:   FIELD_W - 12,
             height:  ROW_H - 14,
             ellipsis: true,
           });
      } else {
        doc.fillColor("#d1d5db").font("Helvetica").fontSize(8.5)
           .text("—", cx + 6, ry + 7, { lineBreak: false });
      }

      // Column divider (not after last column)
      if (ci < 4) {
        doc.moveTo(cx + FIELD_W, ry).lineTo(cx + FIELD_W, ry + ROW_H)
           .lineWidth(0.5).strokeColor("#e5e7eb").stroke();
      }

      cx += FIELD_W;
    });

    // Row bottom border (not after last row)
    if (zi < 3) {
      doc.moveTo(M, ry + ROW_H).lineTo(M + CW, ry + ROW_H)
         .lineWidth(0.5).strokeColor("#e5e7eb").stroke();
    }
  });

  // Outer table border
  const tableStartY = y - THEAD_H;
  const tableH      = THEAD_H + ROW_H * 4;
  doc.rect(M, tableStartY, CW, tableH).lineWidth(0.8).strokeColor("#d1d5db").stroke();

  // ─── FOOTER ────────────────────────────────────────────────────────────────
  const footerY = PH - M - 6;
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

    const doc    = new PDFDocument({ size: "A4", margin: 0, compress: true });
    const chunks = [];

    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => {
      const pdf = Buffer.concat(chunks);

      const emotionSlug = (data.emotion || "emotion")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "")
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
