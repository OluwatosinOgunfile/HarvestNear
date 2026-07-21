import { put } from "@vercel/blob";
import { neon } from "@neondatabase/serverless";
import { readFile } from "node:fs/promises";
import { join, normalize } from "node:path";

if (!process.env.DATABASE_URL || !process.env.BLOB_READ_WRITE_TOKEN) {
  throw new Error("DATABASE_URL and BLOB_READ_WRITE_TOKEN are required");
}

const sql = neon(process.env.DATABASE_URL);
const images = await sql`SELECT id, listing_id, url FROM listing_images WHERE url LIKE 'data:image/%;base64,%' OR url LIKE '/produce/%'`;
let migrated = 0;
const uploadedLocalFiles = new Map();

for (const image of images) {
  const sourceUrl = String(image.url);
  const match = sourceUrl.match(/^data:image\/(jpeg|png|webp);base64,(.+)$/i);
  let blobUrl;
  if (match) {
    const extension = match[1].toLowerCase() === "jpeg" ? "jpg" : match[1].toLowerCase();
    const contentType = extension === "jpg" ? "image/jpeg" : `image/${extension}`;
    const blob = await put(`listing-images/migrated/${image.listing_id}-${image.id}.${extension}`, Buffer.from(match[2], "base64"), { access: "private", contentType, addRandomSuffix: false });
    blobUrl = blob.url;
  } else if (sourceUrl.startsWith("/produce/")) {
    blobUrl = uploadedLocalFiles.get(sourceUrl);
    if (!blobUrl) {
      const relativePath = normalize(sourceUrl.slice(1));
      if (!relativePath.startsWith(`produce${process.platform === "win32" ? "\\" : "/"}`)) throw new Error(`Unsafe local image path: ${sourceUrl}`);
      const extension = sourceUrl.split(".").pop().toLowerCase();
      const contentType = extension === "jpg" || extension === "jpeg" ? "image/jpeg" : `image/${extension}`;
      const file = await readFile(join(process.cwd(), "public", relativePath));
      const blob = await put(`listing-images/catalog/${sourceUrl.split("/").pop()}`, file, { access: "private", contentType, addRandomSuffix: false });
      blobUrl = blob.url;
      uploadedLocalFiles.set(sourceUrl, blobUrl);
    }
  } else continue;
  await sql`UPDATE listing_images SET url = ${blobUrl} WHERE id = ${image.id}`;
  migrated += 1;
}

console.log(`Migrated ${migrated} listing image${migrated === 1 ? "" : "s"} to Vercel Blob.`);
