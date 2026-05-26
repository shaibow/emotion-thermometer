const fs = require("fs");
const path = require("path");
const JSZip = require("jszip");
const { PDFParse } = require("pdf-parse");

const examplesDir = path.join(__dirname, "..", "examples");

async function extractDocx(filePath) {
  const buf = fs.readFileSync(filePath);
  const zip = await JSZip.loadAsync(buf);
  const xml = await zip.file("word/document.xml").async("string");
  const text = xml
    .replace(/<w:tab[^/]*\/>/g, "\t")
    .replace(/<w:br[^/]*\/>/g, "\n")
    .replace(/<\/w:p>/g, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  return text;
}

async function extractPdf(filePath) {
  const buf = fs.readFileSync(filePath);
  const parser = new PDFParse({ data: buf });
  const result = await parser.getText();
  return result.text.trim();
}

(async () => {
  const files = fs.readdirSync(examplesDir);
  for (const name of files) {
    const fp = path.join(examplesDir, name);
    let text = "";
    if (name.endsWith(".docx")) {
      text = await extractDocx(fp);
    } else if (name.endsWith(".pdf")) {
      text = await extractPdf(fp);
    } else {
      continue;
    }
    const out = path.join(
      examplesDir,
      name.replace(/\.[^.]+$/, ".extracted.txt")
    );
    fs.writeFileSync(out, text, "utf8");
    console.log("=== " + name + " ===\n");
    console.log(text);
    console.log("\n--- saved to " + out + " ---\n");
  }
})();
