import { GAME_IDS, isGameId } from "./identities.js";
import { parseEntry, type GameEntry } from "./entry.js";
export interface LoadOptions { signal?: AbortSignal; timeoutMs?: number }
export type EntryLoadResult = { status: "loaded"; entry: GameEntry }
  | { status: "unknown-game" | "invalid-options" | "aborted" | "timeout" | "capacity" | "load-failed" | "invalid-entry" };
export const MAX_PENDING_IMPORTS = 4;
/** Inject only trusted statically enumerated import functions, never paths received from clients. */
export function createEntryLoader(importers: Record<string, () => Promise<unknown>>) {
  if (!importers || typeof importers !== "object" || Object.keys(importers).length !== GAME_IDS.length
    || GAME_IDS.some(id => !Object.hasOwn(importers, id) || typeof importers[id] !== "function")) throw new TypeError("invalid-game-imports");
  const sources = { ...importers };
  let pending = 0;
  return async function load(id: unknown, options: LoadOptions = {}): Promise<EntryLoadResult> {
    if (!isGameId(id)) return { status: "unknown-game" };
    if (!options || typeof options !== "object" || Object.keys(options).some(key => key !== "signal" && key !== "timeoutMs")) return { status: "invalid-options" };
    const { signal, timeoutMs = 5000 } = options;
    if (!Number.isSafeInteger(timeoutMs) || timeoutMs < 10 || timeoutMs > 30_000
      || (signal !== undefined && (!signal || typeof signal.aborted !== "boolean" || typeof signal.addEventListener !== "function" || typeof signal.removeEventListener !== "function"))) return { status: "invalid-options" };
    if (signal?.aborted) return { status: "aborted" };
    if (pending >= MAX_PENDING_IMPORTS) return { status: "capacity" };
    pending++;
    return new Promise<EntryLoadResult>(resolve => {
      let settled = false;
      const finish = (result: EntryLoadResult) => {
        if (settled) return; settled = true;
        clearTimeout(timer);
        try { signal?.removeEventListener("abort", abort); } catch { /* Fixed result; never expose provider diagnostics. */ }
        resolve(result);
      };
      const abort = () => finish({ status: "aborted" });
      const timer = setTimeout(() => finish({ status: "timeout" }), timeoutMs);
      try {
        signal?.addEventListener("abort", abort, { once: true });
        if (signal?.aborted || settled) { pending--; finish({ status: "aborted" }); return; }
      } catch { pending--; finish({ status: "invalid-options" }); return; }
      let importing: Promise<unknown>;
      try { importing = Promise.resolve(sources[id]!()); }
      catch { pending--; finish({ status: "load-failed" }); return; }
      // Timeout/abort cannot cancel JS module evaluation. Retain its capacity until actual settlement.
      void importing.then(module => {
        pending--;
        if (settled) return;
        try { finish({ status: "loaded", entry: parseEntry(module, id) }); }
        catch { finish({ status: "invalid-entry" }); }
      }, () => { pending--; finish({ status: "load-failed" }); });
    });
  };
}
