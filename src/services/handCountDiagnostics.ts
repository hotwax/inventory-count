/**
 * Structured diagnostics for the handcount and sync path, sent to Faro as events.
 *
 * Events, not logs: the app logger only ships lines at or above VITE_DEFAULT_LOG_LEVEL ("error" in
 * .env.example), so an info or warn line from here would never leave the device. A Faro event is
 * not filtered by that level. Raw console.* never reaches Faro either (captureConsole is off), and
 * a web worker has no logger at all, so the worker posts a message that is relayed from here.
 *
 * Every value is flattened to a short string. Faro's beforeSend (faroUtil.scrubSecrets) still
 * redacts tokens and JWTs in event attributes, so nothing here needs to handle secrets itself, but
 * nothing sensitive should be added either: product ids and quantities only.
 */

type Value = string | number | boolean | null | undefined;
export type DiagnosticData = Record<string, Value | Value[]>;
export type DiagnosticSeverity = "info" | "warn";

const EVENT_DOMAIN = "inventory-count";
const MAX_VALUE_LENGTH = 1500;
const MAX_LISTED = 20;

function flatten(value: Value | Value[]): string {
  const text = Array.isArray(value) ? value.join(",") : String(value ?? "");

  return text.length > MAX_VALUE_LENGTH ? `${text.slice(0, MAX_VALUE_LENGTH)}…` : text;
}

/** Faro event attributes must all be strings. */
export function toAttributes(data: DiagnosticData, severity: DiagnosticSeverity): Record<string, string> {
  const attributes: Record<string, string> = { severity };
  for(const [key, value] of Object.entries(data)) {
    attributes[key] = flatten(value);
  }

  return attributes;
}

export function errorMessage(error: any): string {
  return String(error?.message ?? error ?? "unknown error").slice(0, 300);
}

/**
 * Sends `handcount.<name>` to Faro. Never throws and never waits for the caller: telemetry must not
 * change what the store sees. A no-op when Faro is off (no collector URL) or not loaded yet.
 */
export async function reportDiagnostic(name: string, data: DiagnosticData = {}, severity: DiagnosticSeverity = "info") {
  try {
    const sdk = await import("@grafana/faro-web-sdk");
    sdk.faro?.api?.pushEvent(`handcount.${name}`, toAttributes(data, severity), EVENT_DOMAIN);
  } catch {
    // Nothing to do: a log about logging would be worse than the gap.
  }
}

/** Relays a `{ type: "diagnostic" }` message posted by the sync worker. Returns true when it handled one. */
export function relayWorkerDiagnostic(message: any, sessionId: string): boolean {
  if(message?.type !== "diagnostic" || typeof message.name !== "string") {return false;}
  void reportDiagnostic(
    `worker_${message.name}`,
    { sessionId, ...(message.data || {}) },
    message.severity === "warn" ? "warn" : "info"
  );

  return true;
}

export interface LocalSessionSummary {
  recordCount: number;
  distinctProducts: number;
  /** Products held by more than one local record: their quantities are summed on screen. */
  duplicateProducts: string[];
  /** Local records that are not on the server yet, or changed after their last sync. */
  unsyncedRecords: number;
  pendingScanEvents: number;
  pendingScanProducts: string[];
  /** Age in seconds of the oldest scan event that has not been merged into a record. */
  oldestPendingScanAgeSeconds: number;
}

/**
 * Describes what this device holds locally for one session, which is exactly what the handcount
 * screen adds up. A product with two records, or a scan event that stays unmerged, is how the
 * screen can show more than the server stores. Pure: the caller reads the two tables.
 */
export function summarizeLocalSession(
  records: any[],
  pendingEvents: any[],
  needsSync: (record: any) => boolean,
  now = Date.now()
): LocalSessionSummary {
  const perProduct = new Map<string, number>();
  for(const record of records) {
    if(!record.productId) {continue;}
    const key = String(record.productId).trim();
    perProduct.set(key, (perProduct.get(key) || 0) + 1);
  }
  const pendingProducts = [...new Set(pendingEvents.map(event => String(event.productId || event.scannedValue || "")).filter(Boolean))];
  const oldest = pendingEvents.reduce((min, event) => Math.min(min, Number(event.createdAt) || now), now);

  return {
    recordCount: records.length,
    distinctProducts: perProduct.size,
    duplicateProducts: [...perProduct].filter(([, count]) => count > 1).map(([productId]) => productId).slice(0, MAX_LISTED),
    unsyncedRecords: records.filter(needsSync).length,
    pendingScanEvents: pendingEvents.length,
    pendingScanProducts: pendingProducts.slice(0, MAX_LISTED),
    oldestPendingScanAgeSeconds: pendingEvents.length ? Math.round((now - oldest) / 1000) : 0
  };
}

export function localStateSeverity(summary: LocalSessionSummary): DiagnosticSeverity {
  return summary.duplicateProducts.length || summary.pendingScanEvents ? "warn" : "info";
}

/** `productId:expected>typed` for the first few edits of a save, so a save can be replayed by eye. */
export function describeEdits(edits: { productId: string; quantity: number; expectedQuantity: number }[]): string[] {
  return edits.slice(0, MAX_LISTED).map(edit => `${edit.productId}:${edit.expectedQuantity}>${edit.quantity}`);
}
