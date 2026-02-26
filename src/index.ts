import { Hono } from "hono";
import { serveStatic } from "hono/bun";
import { cache } from "hono/cache";
import { readdir } from "node:fs/promises";
import { join, extname } from "node:path";

const app = new Hono();

const IMAGES_DIR = join(import.meta.dir, "..", "public", "images");
const THUMBNAILS_DIR = join(import.meta.dir, "..", "public", "thumbnails");
const ALLOWED_EXTENSIONS = new Set([".jpg", ".jpeg", ".png", ".webp", ".gif"]);

// API: list all products (auto-discovered from images folder)
app.get("/api/products", async (c) => {
  try {
    const files = await readdir(IMAGES_DIR);
    const products = files
      .filter((f) => {
        const ext = extname(f).toLowerCase();
        return ALLOWED_EXTENSIONS.has(ext);
      })
      .map((filename) => {
        const ext = extname(filename);
        const name = filename.slice(0, -ext.length);
        const thumbnail = `${name}.webp`;
        return { name, filename, thumbnail };
      })
      .sort((a, b) => a.name.localeCompare(b.name));

    return c.json({ products, total: products.length });
  } catch (err) {
    console.error("Failed to read images directory:", err);
    return c.json(
      { products: [], total: 0, error: "Failed to read images" },
      500
    );
  }
});

// Cache headers for static assets (images & thumbnails)
app.use("/images/*", async (c, next) => {
  await next();
  c.res.headers.set(
    "Cache-Control",
    "public, max-age=31536000, immutable"
  );
});

app.use("/thumbnails/*", async (c, next) => {
  await next();
  c.res.headers.set(
    "Cache-Control",
    "public, max-age=31536000, immutable"
  );
});

// Serve static files (images, thumbnails, HTML)
app.use("/images/*", serveStatic({ root: "./public" }));
app.use("/thumbnails/*", serveStatic({ root: "./public" }));
app.use("/*", serveStatic({ root: "./public" }));

const port = parseInt(process.env.PORT || "3000");

console.log(`Product Catalog server running on http://localhost:${port}`);
console.log(`Serving images from: ${IMAGES_DIR}`);
console.log(`Serving thumbnails from: ${THUMBNAILS_DIR}`);

export default {
  port,
  fetch: app.fetch,
};
