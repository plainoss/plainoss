import { describe, it, expect } from "vitest";
import { PLAINOSS_VERSION } from "../src/index";

describe("PlainOSS Core Foundation", () => {
  it("exports correct base version", () => {
    expect(PLAINOSS_VERSION).toBe("0.1.0");
  });
});
