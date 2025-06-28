import { parse, isValid } from "date-fns";
import { formats } from "../data.js";

export default function normalizeDate(dateStr) {
  if (!dateStr) return null;

  // Handle known timezone abbreviations by replacing them with offsets
  const tzMap = {
    WAT: "+0100",
    // add more if needed, e.g.:
    // EST: "-0500",
    // PST: "-0800",
  };

  // Replace timezone abbreviation if present
  Object.entries(tzMap).forEach(([abbr, offset]) => {
    if (dateStr.includes(abbr)) {
      dateStr = dateStr.replace(abbr, offset);
    }
  });

  for (const fmt of formats) {
    const dt = parse(dateStr, fmt, new Date());
    if (isValid(dt)) {
      return dt;
    }
  }

  // Last resort: try Date.parse()
  const timestamp = Date.parse(dateStr);
  if (!isNaN(timestamp)) return new Date(timestamp);

  return null; // or throw error if preferred
}
