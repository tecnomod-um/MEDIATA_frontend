import { expect, it } from "vitest";
import { simultaneousNoiseRadius } from "./geometricNoise";

it("bounds the chance that any released geometric noise cell exceeds its radius", () => {
  for (const variance of [4, 24, 112, 20 / 9, 80 / 9]) {
    const q = (Math.sqrt(1 + 2 * variance) - 1) / (Math.sqrt(1 + 2 * variance) + 1);
    for (const bins of [3, 24, 64]) {
      const radius = simultaneousNoiseRadius([variance], bins);
      const bound = bins * 2 * q ** (radius + 1) / (1 + q);
      expect(bound).toBeLessThanOrEqual(.025);
      expect(radius).toBeGreaterThanOrEqual(0);
      expect(simultaneousNoiseRadius([variance, variance], bins)).toBeGreaterThanOrEqual(radius * 2);
    }
  }
});
