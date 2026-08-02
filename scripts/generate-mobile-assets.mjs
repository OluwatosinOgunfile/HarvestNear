import { mkdir } from "node:fs/promises";
import sharp from "sharp";

await mkdir("assets", { recursive: true });

const icon = await sharp("public/brand/harvestnearu-approved-mark.png")
  .resize(680, 810, { fit: "contain" })
  .png()
  .toBuffer();

const lockup = await sharp("public/brand/harvestnearu-full-lockup.png")
  .resize(1500, 1100, { fit: "contain" })
  .png()
  .toBuffer();

await Promise.all([
  sharp({ create: { width: 1024, height: 1024, channels: 4, background: "#f7f9f5" } })
    .composite([{ input: icon, gravity: "center" }])
    .png()
    .toFile("assets/icon-only.png"),
  sharp({ create: { width: 2732, height: 2732, channels: 4, background: "#f7f9f5" } })
    .composite([{ input: lockup, gravity: "center" }])
    .png()
    .toFile("assets/splash.png"),
]);
