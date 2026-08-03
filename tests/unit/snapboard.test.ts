import { JSDOM } from "jsdom";
import { describe, expect, it } from "vitest";
import { extractSnapBoardValues } from "../../shared/snapboard";

const snapBoardHtml = `
  <div class="results-grid">
    <div class="result-card">
      <span class="username-value">chl20</span>
      <span class="display-value">✧ chloe ✧</span>
    </div>
    <div class="result-card">
      <span class="username-value">lunarz</span>
      <span class="display-value">chlo</span>
    </div>
    <div class="result-card">
      <span class="username-value">cloudlet.chloe</span>
      <span class="display-value">chloe ⭐🖤</span>
    </div>
  </div>
`;

describe("SnapBoard selector extraction", () => {
  it("extracts all generated usernames from SnapBoard result cards", () => {
    const document = new JSDOM(snapBoardHtml).window.document;

    expect(extractSnapBoardValues(document, "username")).toEqual(["chl20", "lunarz", "cloudlet.chloe"]);
  });

  it("extracts all display names from SnapBoard result cards", () => {
    const document = new JSDOM(snapBoardHtml).window.document;

    expect(extractSnapBoardValues(document, "name")).toEqual(["✧ chloe ✧", "chlo", "chloe ⭐🖤"]);
  });
});
