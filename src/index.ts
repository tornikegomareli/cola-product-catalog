import { Hono } from "hono";
import { serveStatic } from "hono/bun";
import { cache } from "hono/cache";
import { readdir } from "node:fs/promises";
import { join, extname } from "node:path";

const app = new Hono();

const IMAGES_DIR = join(import.meta.dir, "..", "public", "images");
const IMAGES_PEPSI_DIR = join(import.meta.dir, "..", "public", "images-pepsi");
const THUMBNAILS_DIR = join(import.meta.dir, "..", "public", "thumbnails");
const THUMBNAILS_PEPSI_DIR = join(
  import.meta.dir,
  "..",
  "public",
  "thumbnails-pepsi"
);
const ALLOWED_EXTENSIONS = new Set([".jpg", ".jpeg", ".png", ".webp", ".gif"]);

function readProducts(dir: string) {
  return readdir(dir).then((files) =>
    files
      .filter((f) => ALLOWED_EXTENSIONS.has(extname(f).toLowerCase()))
      .map((filename) => {
        const ext = extname(filename);
        const name = filename.slice(0, -ext.length);
        const thumbnail = `${name}.webp`;
        return { name, filename, thumbnail };
      })
      .sort((a, b) => a.name.localeCompare(b.name))
  );
}

// API: list all products (auto-discovered from images folders)
app.get("/api/products", async (c) => {
  try {
    const [cola, pepsi] = await Promise.all([
      readProducts(IMAGES_DIR),
      readProducts(IMAGES_PEPSI_DIR).catch(() => []),
    ]);

    return c.json({
      cola: { products: cola, total: cola.length },
      pepsi: { products: pepsi, total: pepsi.length },
    });
  } catch (err) {
    console.error("Failed to read images directory:", err);
    return c.json(
      {
        cola: { products: [], total: 0 },
        pepsi: { products: [], total: 0 },
        error: "Failed to read images",
      },
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

app.use("/images-pepsi/*", async (c, next) => {
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

app.use("/thumbnails-pepsi/*", async (c, next) => {
  await next();
  c.res.headers.set(
    "Cache-Control",
    "public, max-age=31536000, immutable"
  );
});

// Serve static files (images, thumbnails, HTML)
app.use("/images/*", serveStatic({ root: "./public" }));
app.use("/images-pepsi/*", serveStatic({ root: "./public" }));
app.use("/thumbnails/*", serveStatic({ root: "./public" }));
app.use("/thumbnails-pepsi/*", serveStatic({ root: "./public" }));
app.use("/*", serveStatic({ root: "./public" }));

const port = parseInt(process.env.PORT || "3000");

console.log(`Product Catalog server running on http://localhost:${port}`);
console.log(`Serving images from: ${IMAGES_DIR}`);
console.log(`Serving thumbnails from: ${THUMBNAILS_DIR}`);

export default {
  port,
  fetch: app.fetch,
};
