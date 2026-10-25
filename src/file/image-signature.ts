// The first bytes each allowed image format must start with. The upload's
// MIME type comes from the client, so it's checked against the file itself.
const startsWith = (buffer: Buffer, bytes: number[], offset = 0) =>
  buffer.length >= offset + bytes.length &&
  bytes.every((byte, i) => buffer[offset + i] === byte);

const ascii = (text: string) => [...text].map((c) => c.charCodeAt(0));

const SIGNATURES: Record<string, (buffer: Buffer) => boolean> = {
  "image/jpeg": (b) => startsWith(b, [0xff, 0xd8, 0xff]),
  "image/png": (b) =>
    startsWith(b, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  "image/gif": (b) =>
    startsWith(b, ascii("GIF87a")) || startsWith(b, ascii("GIF89a")),
  "image/webp": (b) =>
    startsWith(b, ascii("RIFF")) && startsWith(b, ascii("WEBP"), 8),
};

export const ALLOWED_IMAGE_TYPES = Object.keys(SIGNATURES);

/** True when the file's content really is the image type it claims to be. */
export const matchesImageType = (buffer: Buffer, mimetype: string): boolean =>
  SIGNATURES[mimetype]?.(buffer) ?? false;
