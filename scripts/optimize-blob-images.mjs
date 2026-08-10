import { del, get, put } from "@vercel/blob";
import { neon } from "@neondatabase/serverless";
import sharp from "sharp";

if (!process.env.DATABASE_URL || !process.env.BLOB_READ_WRITE_TOKEN) {
  throw new Error("DATABASE_URL and BLOB_READ_WRITE_TOKEN are required");
}

const sql = neon(process.env.DATABASE_URL);

async function readPrivateBlob(url) {
  const result = await get(url, { access: "private" });
  if (!result || result.statusCode !== 200) throw new Error(`Could not read ${url}`);
  return Buffer.from(await new Response(result.stream).arrayBuffer());
}

async function optimize(input, purpose) {
  const profile = purpose === "profile";
  const source = sharp(input, { limitInputPixels: 40_000_000 });
  const metadata = await source.metadata();
  const output = await source
    .rotate()
    .resize({ width: profile ? 512 : 1600, height: profile ? 512 : 1200, fit: profile ? "cover" : "inside", position: profile ? "attention" : "centre", withoutEnlargement: true })
    .webp({ quality: profile ? 84 : 82, effort: 4, smartSubsample: true })
    .toBuffer();
  return !profile && metadata.format === "webp" && output.length >= input.length ? input : output;
}

const listingImages = await sql`
  SELECT id, listing_id AS owner_id, url, 'listing' AS purpose
  FROM listing_images
  WHERE url LIKE 'https://%.blob.vercel-storage.com/%'
    AND url NOT LIKE '%/optimized/%'
`;
const profileImages = await sql`
  SELECT id, id AS owner_id, avatar_url AS url, 'profile' AS purpose
  FROM users
  WHERE avatar_url LIKE 'https://%.blob.vercel-storage.com/%'
    AND avatar_url NOT LIKE '%/optimized/%'
`;

let optimizedCount = 0;
let bytesBefore = 0;
let bytesAfter = 0;

for (const image of [...listingImages, ...profileImages]) {
  const oldUrl = String(image.url);
  try {
    const input = await readPrivateBlob(oldUrl);
    const output = await optimize(input, image.purpose);
    const pathname = `${image.purpose === "profile" ? "profile-images" : "listing-images"}/optimized/${image.owner_id}-${image.id}.webp`;
    const replacement = await put(pathname, output, { access: "private", contentType: "image/webp", addRandomSuffix: false });
    try {
      if (image.purpose === "profile") await sql`UPDATE users SET avatar_url = ${replacement.url}, updated_at = now() WHERE id = ${image.id} AND avatar_url = ${oldUrl}`;
      else await sql`UPDATE listing_images SET url = ${replacement.url} WHERE id = ${image.id} AND url = ${oldUrl}`;
    } catch (error) {
      await del(replacement.url).catch(() => undefined);
      throw error;
    }
    await del(oldUrl).catch((error) => console.error(`Old Blob cleanup failed for ${oldUrl}`, error));
    optimizedCount += 1;
    bytesBefore += input.length;
    bytesAfter += output.length;
    console.log(`Optimized ${image.purpose} image ${image.id}: ${input.length} -> ${output.length} bytes`);
  } catch (error) {
    console.error(`Skipped ${image.purpose} image ${image.id}`, error);
  }
}

console.log(`Optimized ${optimizedCount} images. ${bytesBefore} bytes before, ${bytesAfter} bytes after.`);
