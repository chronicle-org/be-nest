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
