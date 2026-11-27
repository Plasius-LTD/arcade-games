import { readFileSync } from "node:fs";
import { expect, it } from "vitest";

const witnesses = JSON.parse(readFileSync(new URL("./fixtures/prism-completion-witnesses.json", import.meta.url), "utf8"));

it("keeps automated completion records separate from human and public qualification", () => {
  expect(witnesses.kind).toBe("automated-private-completion");
  expect(Object.keys(witnesses.records)).toHaveLength(180);
});
