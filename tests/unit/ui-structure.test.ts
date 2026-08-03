import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("Sift UI structure", () => {
  it("groups dashboard actions by primary, mode, export, and destructive intent", () => {
    const app = readFileSync("dashboard/src/App.tsx", "utf8");

    expect(app).toContain('className="toolbar-group primary-group"');
    expect(app).toContain('className="mode-switch"');
    expect(app).toContain('className="toolbar-group export-group"');
    expect(app).toContain('className="danger-action"');
  });

  it("keeps popup actions focused around one primary scan control", () => {
    const popup = readFileSync("extension/popup.html", "utf8");

    expect(popup).toContain('class="popup-actions"');
    expect(popup).toContain('class="primary-action"');
    expect(popup).toContain('class="secondary-action"');
  });

  it("uses comfortable minimum button hit targets", () => {
    const dashboardStyles = readFileSync("dashboard/src/styles.css", "utf8");
    const popupStyles = readFileSync("extension/styles/popup.css", "utf8");

    expect(dashboardStyles).toMatch(/min-height:\s*44px/u);
    expect(popupStyles).toMatch(/min-height:\s*44px/u);
  });
});
