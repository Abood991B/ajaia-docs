import fs from "node:fs/promises";
import mammoth from "mammoth";

const buffer = await fs.readFile(process.argv[2]);
try {
  const result = await mammoth.convertToHtml({ buffer });
  console.log("OK", JSON.stringify(result.value));
} catch (error) {
  console.log("FAIL", error instanceof Error ? error.message : String(error));
}
