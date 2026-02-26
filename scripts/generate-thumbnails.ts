import sharp from "sharp";
import { readdir, mkdir } from "node:fs/promises";
import { join, extname } from "node:path";

const IMAGES_DIR = join(import.meta.dir, "..", "public", "images");
const THUMBNAILS_DIR = join(import.meta.dir, "..", "public", "thumbnails");
const ALLOWED_EXTENSIONS = new Set([".jpg", ".jpeg", ".png", ".webp", ".gif"]);
const THUMBNAIL_WIDTH = 400; // 400px wide — sharp for grid cards, retina-ready

async function generateThumbnails() {
  // Ensure output directory exists
  await mkdir(THUMBNAILS_DIR, { recursive: true });

  const files = await readdir(IMAGES_DIR);
  const imageFiles = files.filter((f) =>
    ALLOWED_EXTENSIONS.has(extname(f).toLowerCase())
  );

  console.log(`Found ${imageFiles.length} images. Generating thumbnails...`);

  let success = 0;
  let failed = 0;

  // Process in batches of 5 to avoid memory issues
  const BATCH_SIZE = 5;
  for (let i = 0; i < imageFiles.length; i += BATCH_SIZE) {
    const batch = imageFiles.slice(i, i + BATCH_SIZE);
    const results = await Promise.allSettled(
      batch.map(async (filename) => {
        const inputPath = join(IMAGES_DIR, filename);
        const nameWithoutExt = filename.slice(0, -extname(filename).length);
        const outputPath = join(THUMBNAILS_DIR, `${nameWithoutExt}.webp`);

        await sharp(inputPath)
          .resize(THUMBNAIL_WIDTH, undefined, {
            withoutEnlargement: true,
            fit: "inside",
          })
          .webp({ quality: 80 })
          .toFile(outputPath);

        return filename;
      })
    );

    for (const result of results) {
      if (result.status === "fulfilled") {
        success++;
      } else {
        failed++;
        console.error(`  Failed:`, result.reason);
      }
    }

    // Progress indicator
    const done = Math.min(i + BATCH_SIZE, imageFiles.length);
    console.log(`  Progress: ${done}/${imageFiles.length}`);
  }

  console.log(`\nDone! ${success} thumbnails generated, ${failed} failed.`);

  // Show size comparison
  const { statSync } = require("node:fs");
  let originalTotal = 0;
  let thumbTotal = 0;

  for (const filename of imageFiles) {
    const nameWithoutExt = filename.slice(0, -extname(filename).length);
    const thumbPath = join(THUMBNAILS_DIR, `${nameWithoutExt}.webp`);
    try {
      originalTotal += statSync(join(IMAGES_DIR, filename)).size;
      thumbTotal += statSync(thumbPath).size;
    } catch {}
  }

  const origMB = (originalTotal / 1024 / 1024).toFixed(1);
  const thumbMB = (thumbTotal / 1024 / 1024).toFixed(1);
  const ratio = (originalTotal / thumbTotal).toFixed(0);
  console.log(
    `\nSize: ${origMB}MB originals -> ${thumbMB}MB thumbnails (${ratio}x smaller)`
  );
}

generateThumbnails().catch((err) => {
  console.error("Thumbnail generation failed:", err);
  process.exit(1);
});
