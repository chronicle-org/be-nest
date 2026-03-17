export const generateHandle = (name: string): string => {
  const base = name
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/[^a-z0-9]/g, "");

  const now = new Date();
  const datePart = now
    .toISOString()
    .slice(0, 16)
    .replace("T", "")
    .replace(/[-:]/g, "");

  return `${base}${datePart}`;
};

export const calculateReadingTime = (htmlContent: string): number => {
  // Remove HTML tags
  const plainText = htmlContent.replace(/<[^>]*>/g, "");

  // Count words (average reading speed: 200 words per minute)
  const wordCount = plainText
    .trim()
    .split(/\s+/)
    .filter((word) => word.length > 0).length;

  const readingTimeMinutes = Math.ceil(wordCount / 200);

  return Math.max(1, readingTimeMinutes); // Minimum 1 minute
};
