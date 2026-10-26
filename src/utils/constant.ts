import { FileUploadCategory } from "./file-upload-category.enum";

export const fileUploadKey = {
  1: FileUploadCategory.POST_THUMBNAIL,
  2: FileUploadCategory.PROFILE_BANNER,
  3: FileUploadCategory.PROFILE_PICTURE,
};

// Export enum for new code to use
export { FileUploadCategory };

const ONE_MINUTE_MS = 60_000;

// Per-IP rate limits for @nestjs/throttler (ttl is in milliseconds), grouped by module.
export const RATE_LIMIT = {
  // Applies to every route unless a controller overrides it.
  GLOBAL: { ttl: ONE_MINUTE_MS, limit: 120 },
  AUTH: {
    LOGIN: { ttl: ONE_MINUTE_MS, limit: 10 },
    REGISTER: { ttl: ONE_MINUTE_MS, limit: 10 },
    CHANGE_PASSWORD: { ttl: ONE_MINUTE_MS, limit: 10 },
    DELETE_ACCOUNT: { ttl: ONE_MINUTE_MS, limit: 10 },
  },
  POST: {
    // Public view/share counter; callable without logging in.
    COUNTER: { ttl: ONE_MINUTE_MS, limit: 30 },
  },
} as const;

// Postgres SQLSTATE error codes we handle (https://www.postgresql.org/docs/current/errcodes-appendix.html).
// Neither pg nor TypeORM exports these.
export const PG_ERROR = {
  UNIQUE_VIOLATION: "23505",
} as const;
