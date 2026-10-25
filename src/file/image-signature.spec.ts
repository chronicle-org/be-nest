import { matchesImageType } from "./image-signature";

const bytes = (...values: (number | string)[]) =>
  Buffer.concat(
    values.map((v) =>
      typeof v === "string" ? Buffer.from(v, "ascii") : Buffer.from([v]),
    ),
  );

describe("matchesImageType", () => {
  it("accepts files whose content matches their type", () => {
    expect(matchesImageType(bytes(0xff, 0xd8, 0xff, 0xe0), "image/jpeg")).toBe(
      true,
    );
    expect(
      matchesImageType(
        bytes(0x89, "PNG", 0x0d, 0x0a, 0x1a, 0x0a, 0),
        "image/png",
      ),
    ).toBe(true);
    expect(matchesImageType(bytes("GIF89a", 0), "image/gif")).toBe(true);
    expect(
      matchesImageType(bytes("RIFF", 0, 0, 0, 0, "WEBPVP8 "), "image/webp"),
    ).toBe(true);
  });

  it("rejects other content labelled as an image", () => {
    expect(matchesImageType(bytes("<html><script>"), "image/png")).toBe(false);
    expect(matchesImageType(bytes("GIF89a"), "image/jpeg")).toBe(false);
    expect(matchesImageType(Buffer.alloc(0), "image/gif")).toBe(false);
  });

  it("rejects types that aren't allowed", () => {
    expect(matchesImageType(bytes("<svg>"), "image/svg+xml")).toBe(false);
  });
});
