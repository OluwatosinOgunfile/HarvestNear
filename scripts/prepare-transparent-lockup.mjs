import sharp from "sharp";

const [input, output] = process.argv.slice(2);
if (!input || !output) throw new Error("Usage: node scripts/prepare-transparent-lockup.mjs <input.png> <output.png>");

const source = sharp(input).ensureAlpha();
const { data, info } = await source.raw().toBuffer({ resolveWithObject: true });
const { width, height, channels } = info;
function neutralBackground(index) {
  const offset = index * channels;
  const red = data[offset];
  const green = data[offset + 1];
  const blue = data[offset + 2];
  const maximum = Math.max(red, green, blue);
  const minimum = Math.min(red, green, blue);
  return maximum >= 178 && maximum - minimum <= 10;
}

for (let index = 0; index < width * height; index += 1) {
  if (!neutralBackground(index)) continue;
  const offset = index * channels;
  data[offset + 3] = 0;
}

const pinScaleX = width / 2657;
const pinScaleY = height / 400;
const pinWidth = Math.min(width, Math.ceil(264 * pinScaleX));
const pinBacking = Buffer.from(`
  <svg width="${pinWidth}" height="${height}" xmlns="http://www.w3.org/2000/svg">
    <ellipse
      cx="${145 * pinScaleX}"
      cy="${158 * pinScaleY}"
      rx="${124 * pinScaleX}"
      ry="${126 * pinScaleY}"
      fill="#faf8ef"
    />
  </svg>
`);

await sharp(data, { raw: info })
  .composite([{ input: pinBacking, blend: "dest-over", left: 0, top: 0 }])
  .trim({ background: { r: 0, g: 0, b: 0, alpha: 0 } })
  .extend({ top: 8, right: 8, bottom: 8, left: 8, background: { r: 0, g: 0, b: 0, alpha: 0 } })
  .png({ compressionLevel: 9 })
  .toFile(output);
