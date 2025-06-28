import normalizeDate from "./date.js";
/**
 * Normalize all dates in an array of items using normalizeDate.
 * @param {Array<Object>} items - Array of objects with a `.date` string property.
 * @returns {Array<Object>} New array with `.date` parsed as Date or null.
 */
export function normalizeDatesInItems(items) {
  return items.map((item) => ({
    ...item,
    date: item.date ? normalizeDate(item.date) : null,
  }));
}
