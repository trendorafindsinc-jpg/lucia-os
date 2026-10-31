import sharp from "sharp";
export const MAX_UPLOAD_BYTES = 4_000_000;
export const MAX_OPTIMIZED_BYTES = 260_000;
const formats: Record<string, string> = { "image/jpeg": "jpeg", "image/png": "png", "image/webp": "webp" };
export async function compressImage(input: Buffer, mime: string) {
  if (!formats[mime] || !input.length || input.length > MAX_UPLOAD_BYTES) throw Error("Use a JPEG, PNG or WebP image up to 4 MB.");
  const image = sharp(input, { limitInputPixels: 24_000_000, failOn: "warning", animated: false });
  const meta = await image.metadata();
  if (meta.format !== formats[mime] || !meta.width || !meta.height || (meta.pages ?? 1) !== 1) throw Error("The image format does not match or is unsupported.");
  // Autorotate, strip EXIF/location metadata, bound dimensions and quality.
  for (const quality of [78, 66, 54]) {
    const output = await image.clone().rotate().resize({ width: 1600, height: 1600, fit: "inside", withoutEnlargement: true }).webp({ quality, effort: 4 }).toBuffer({ resolveWithObject: true });
    if (output.data.length <= MAX_OPTIMIZED_BYTES) return { data: output.data, width: output.info.width, height: output.info.height, bytes: output.data.length };
  }
  throw Error("This image cannot fit the optimized size limit. Choose a simpler or smaller image.");
}
