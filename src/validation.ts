import { field, type Schema } from "@plasius/schema";
import { GAME_IDS } from "./identities.js";
export const exact = { version: "1.0.0", identity: "exact", unknownFields: "reject" } as const;
export const slug = () => field.string().pattern(/^[a-z][a-z0-9-]{0,63}$/);
export const integer = (min: number, max = Number.MAX_SAFE_INTEGER) => field.number().validator(n => Number.isSafeInteger(n) && n >= min && n <= max);
export const referenceShape = { id: slug(), sha256: field.string().pattern(/^[a-f0-9]{64}$/) };
export const reference = () => field.object(referenceShape);
export const bindingShape = { gameId: field.string().enum(GAME_IDS), rulesVersion: field.version().max(64), contentVersion: field.version().max(64) };
export const translation = () => field.string().pattern(/^arcade\.[a-z0-9.-]{1,180}$/);
export function distinct(values: unknown[]): boolean { return new Set(values).size === values.length; }
/** Fixed public diagnostics; strict envelope identity never inherits schema configuration defaults. */
export function parseRecord<T>(raw: unknown, schema: Schema<any>, bytes: number): T {
  try {
    const encoded = typeof raw === "string" ? raw : JSON.stringify(raw);
    if (typeof encoded !== "string" || encoded.length > bytes || new TextEncoder().encode(encoded).byteLength > bytes) throw new Error();
    const value = typeof raw === "string" ? JSON.parse(raw) : raw;
    if (!value || typeof value !== "object" || Array.isArray(value)
      || typeof value.type !== "string" || typeof value.version !== "string") throw new Error();
    const parsed = schema.validate(value);
    if (!parsed.valid || !parsed.value) throw new Error();
    return structuredClone(parsed.value) as T;
  } catch { throw new TypeError("invalid-arcade-record"); }
}
