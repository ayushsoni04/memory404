import { describe, expect, it } from "vitest";
import { savingStageLabel } from "../extension/src/save-progress.js";

describe("savingStageLabel", () => {
  it("keeps a slow save from looking stuck", () => {
    expect(savingStageLabel(0)).toBe("Saving…");
    expect(savingStageLabel(2499)).toBe("Saving…");
    expect(savingStageLabel(2500)).toBe("Still working…");
    expect(savingStageLabel(5500)).toBe("Almost there…");
    expect(savingStageLabel(10000)).toBe("Taking a bit longer…");
    expect(savingStageLabel(16000)).toBe("Hang tight…");
  });
});
