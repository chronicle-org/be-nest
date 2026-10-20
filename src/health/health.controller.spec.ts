import { ServiceUnavailableException } from "@nestjs/common";
import type { DataSource } from "typeorm";
import { HealthController } from "./health.controller";

const controllerWith = (query: jest.Mock) =>
  new HealthController({ query } as unknown as DataSource);

describe("HealthController", () => {
  it("reports ok when the database answers", async () => {
    await expect(
      controllerWith(jest.fn().mockResolvedValue([])).check(),
    ).resolves.toEqual({ status: "ok" });
  });

  it("returns 503 when the database query fails", async () => {
    await expect(
      controllerWith(jest.fn().mockRejectedValue(new Error("down"))).check(),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);
  });
});
