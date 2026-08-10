import "server-only";

// Sharp 0.35 ships declarations outside the package export map; runtime ESM import is valid.
// @ts-expect-error Upstream package export map does not expose lib/index.d.ts.
import sharp from "sharp";

type ImagePurpose = "listing" | "profile";

const IMAGE_PRESETS = {
  listing: { width: 1600, height: 1200, fit: "inside" as const, quality: 82 },
  profile: { width: 512, height: 512, fit: "cover" as const, quality: 84 },
};

export async function optimizeUploadedImage(file: File, purpose: ImagePurpose) {
  const preset = IMAGE_PRESETS[purpose];
  const input = Buffer.from(await file.arrayBuffer());
  const output = await sharp(input, { limitInputPixels: 40_000_000 })
    .rotate()
    .resize({
      width: preset.width,
      height: preset.height,
      fit: preset.fit,
      position: purpose === "profile" ? "attention" : "centre",
      withoutEnlargement: true,
    })
    .webp({ quality: preset.quality, effort: 4, smartSubsample: true })
    .toBuffer();

  const body = purpose === "listing" && file.type === "image/webp" && output.length >= input.length ? input : output;

  return {
    body,
    contentType: "image/webp" as const,
    extension: "webp" as const,
    originalBytes: file.size,
    optimizedBytes: body.length,
  };
}
