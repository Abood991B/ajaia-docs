import fs from "node:fs/promises";
import path from "node:path";

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

const OUT = path.join(process.cwd(), "src", "app", "fonts");

const targets = [
  {
    url: "https://fonts.googleapis.com/css2?family=Archivo:wght@400..700&display=swap",
    file: "archivo-var.woff2",
  },
  {
    url: "https://fonts.googleapis.com/css2?family=Literata:wght@400..600&display=swap",
    file: "literata-var.woff2",
  },
  {
    url: "https://fonts.googleapis.com/css2?family=Literata:ital,wght@1,400..600&display=swap",
    file: "literata-var-italic.woff2",
  },
  {
    url: "https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400&display=swap",
    file: "plex-mono-400.woff2",
  },
  {
    url: "https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@500&display=swap",
    file: "plex-mono-500.woff2",
  },
];

function latinUrl(css) {
  for (const chunk of css.split("/*").slice(1)) {
    const end = chunk.indexOf("*/");
    const label = chunk.slice(0, end).trim();
    if (label !== "latin") continue;
    const match = chunk.match(/url\((https:[^)]+)\)/);
    if (match) return match[1];
  }
  return null;
}

async function main() {
  await fs.mkdir(OUT, { recursive: true });

  for (const target of targets) {
    const cssResponse = await fetch(target.url, { headers: { "User-Agent": UA } });
    if (!cssResponse.ok) throw new Error(`CSS ${target.url} → ${cssResponse.status}`);
    const css = await cssResponse.text();

    const url = latinUrl(css);
    if (!url) throw new Error(`No latin subset in ${target.url}`);

    const fontResponse = await fetch(url, { headers: { "User-Agent": UA } });
    if (!fontResponse.ok) throw new Error(`Font ${url} → ${fontResponse.status}`);
    const buffer = Buffer.from(await fontResponse.arrayBuffer());

    await fs.writeFile(path.join(OUT, target.file), buffer);
    console.log(`${target.file.padEnd(28)} ${(buffer.length / 1024).toFixed(1)} kB`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
