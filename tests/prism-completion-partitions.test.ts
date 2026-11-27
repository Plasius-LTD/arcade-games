import { readdirSync, readFileSync } from "node:fs";
import { expect, it } from "vitest";

const directory = new URL("./completion/", import.meta.url);
const members = (kind: string) => readdirSync(directory)
  .filter(file => file.startsWith(`${kind}-`) && file.endsWith(".test.ts"))
  .flatMap(file => {
    const source = readFileSync(new URL(file, directory), "utf8");
    const calls = [...source.matchAll(/register(?:Campaign|Endless)Completions\((\[[^\]]*\])\);/gu)];
    expect(calls, file).toHaveLength(1);
    const values = JSON.parse(calls[0]![1]!) as number[];
    expect(values.length, file).toBe(kind === "campaign" ? 10 : 1);
    return values;
  });

it("schedules all 30 authored challenges exactly once with bounded file workloads", () => {
  const actual = members("campaign");
  expect(actual.slice().sort((a, b) => a - b)).toEqual(Array.from({ length: 30 }, (_, i) => i + 1));
  expect(new Set(actual).size).toBe(30);
  expect(readdirSync(directory).filter(file => file.startsWith("campaign-")).length).toBe(3);
});

it("schedules every endless family and tier exactly once without omitting a formation or reflection", () => {
  const actual = members("endless");
  expect(actual.slice().sort((a, b) => a - b)).toEqual([0, 1, 2, 3, 8, 9, 10, 11, 16, 17, 18, 19]);
  expect(new Set(actual).size).toBe(12);
  expect(readdirSync(directory).filter(file => file.startsWith("endless-")).length).toBe(12);
});
