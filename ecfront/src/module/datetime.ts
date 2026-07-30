// Shared timestamp formatting for the Seller/Admin portals.
//
// The backend sends timestamps as naive UTC strings ("YYYY-MM-DD HH:MM:SS", no
// zone marker). We parse them as UTC and render them in the *viewer's* local
// time zone, appending the zone label (e.g. "2026-07-15 23:15:14 GMT+8" for a
// visitor in Singapore) so the same record reads correctly wherever it's opened.

/**
 * Format a backend UTC timestamp in the viewer's local time zone.
 * Returns "YYYY-MM-DD HH:MM:SS <TZ>". Falls back to the raw input if it can't
 * be parsed, and to "" for empty values.
 */
export function formatLocalTimestamp(input?: string | null): string {
  if (!input) return "";
  // Normalize "YYYY-MM-DD HH:MM:SS" → ISO, and force UTC when no zone is present.
  const iso = input.includes("T") ? input : input.replace(" ", "T");
  const hasZone = /(?:[zZ]|[+-]\d\d:?\d\d)$/.test(iso);
  const d = new Date(hasZone ? iso : iso + "Z");
  if (isNaN(d.getTime())) return input;

  // en-CA gives ISO-style YYYY-MM-DD date parts; assemble manually so we keep
  // the existing visual format and just append the local zone abbreviation.
  const parts = new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
    timeZoneName: "short",
  }).formatToParts(d);

  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  const hour = get("hour") === "24" ? "00" : get("hour"); // some engines emit 24 at midnight
  const tz = get("timeZoneName");
  const date = `${get("year")}-${get("month")}-${get("day")}`;
  const time = `${hour}:${get("minute")}:${get("second")}`;
  return tz ? `${date} ${time} ${tz}` : `${date} ${time}`;
}
