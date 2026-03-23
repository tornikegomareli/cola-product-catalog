import sharp from "sharp";
import { readdir, mkdir } from "node:fs/promises";
import { join, extname } from "node:path";

const ALLOWED_EXTENSIONS = new Set([".jpg", ".jpeg", ".png", ".webp", ".gif"]);
const THUMBNAIL_WIDTH = 400; // 400px wide — sharp for grid cards, retina-ready

const IMAGE_SETS = [
  {
    name: "Cola",
    imagesDir: join(import.meta.dir, "..", "public", "images"),
    thumbsDir: join(import.meta.dir, "..", "public", "thumbnails"),
  },
  {
    name: "Pepsi",
    imagesDir: join(import.meta.dir, "..", "public", "images-pepsi"),
    thumbsDir: join(import.meta.dir, "..", "public", "thumbnails-pepsi"),
  },
];

async function generateThumbnailsForSet(
  name: string,
  imagesDir: string,
  thumbsDir: string
) {
  await mkdir(thumbsDir, { recursive: true });

  let files: string[];
  try {
    files = await readdir(imagesDir);
  } catch {
    console.log(`Skipping ${name}: images directory not found`);
    return;
  }

  const imageFiles = files.filter((f) =>
    ALLOWED_EXTENSIONS.has(extname(f).toLowerCase())
  );

  console.log(
    `\n[${name}] Found ${imageFiles.length} images. Generating thumbnails...`
  );

  let success = 0;
  let failed = 0;

  const BATCH_SIZE = 5;
  for (let i = 0; i < imageFiles.length; i += BATCH_SIZE) {
    const batch = imageFiles.slice(i, i + BATCH_SIZE);
    const results = await Promise.allSettled(
      batch.map(async (filename) => {
        const inputPath = join(imagesDir, filename);
        const nameWithoutExt = filename.slice(0, -extname(filename).length);
        const outputPath = join(thumbsDir, `${nameWithoutExt}.webp`);

        await sharp(inputPath)
          .rotate() // auto-fix EXIF orientation
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

    const done = Math.min(i + BATCH_SIZE, imageFiles.length);
    console.log(`  Progress: ${done}/${imageFiles.length}`);
  }

  console.log(`[${name}] Done! ${success} thumbnails generated, ${failed} failed.`);

  const { statSync } = require("node:fs");
  let originalTotal = 0;
  let thumbTotal = 0;

  for (const filename of imageFiles) {
    const nameWithoutExt = filename.slice(0, -extname(filename).length);
    const thumbPath = join(thumbsDir, `${nameWithoutExt}.webp`);
    try {
      originalTotal += statSync(join(imagesDir, filename)).size;
      thumbTotal += statSync(thumbPath).size;
    } catch {}
  }

  if (thumbTotal > 0) {
    const origMB = (originalTotal / 1024 / 1024).toFixed(1);
    const thumbMB = (thumbTotal / 1024 / 1024).toFixed(1);
    const ratio = (originalTotal / thumbTotal).toFixed(0);
    console.log(
      `[${name}] Size: ${origMB}MB originals -> ${thumbMB}MB thumbnails (${ratio}x smaller)`
    );
  }
}

async function generateAllThumbnails() {
  for (const set of IMAGE_SETS) {
    await generateThumbnailsForSet(set.name, set.imagesDir, set.thumbsDir);
  }
}

generateAllThumbnails().catch((err) => {
  console.error("Thumbnail generation failed:", err);
  process.exit(1);
});
