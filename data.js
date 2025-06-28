export const formats = [
  // Month name, day, year
  "MMMM d, yyyy", // June 22, 2025
  "MMM d, yyyy", // Jun 22, 2025

  // Day, Month name, year
  "d MMMM yyyy", // 22 June 2025
  "d MMM yyyy", // 22 Jun 2025

  // Numeric day/month/year (common variations)
  "dd MM yyyy", // 22 06 2025
  "d M yyyy", // 2 6 2025
  "dd/MM/yyyy", // 22/06/2025
  "d/M/yyyy", // 2/6/2025
  "dd-MM-yyyy", // 22-06-2025
  "d-M-yyyy", // 2-6-2025
  "yyyy-MM-dd", // 2025-06-22
  "yyyy/MM/dd", // 2025/06/22

  // With time (24h) - common timestamp styles
  "yyyy-MM-dd HH:mm:ss", // 2025-06-22 19:57:25
  "yyyy/MM/dd HH:mm:ss", // 2025/06/22 19:57:25
  "dd/MM/yyyy HH:mm:ss", // 22/06/2025 19:57:25
  "d/M/yyyy HH:mm:ss", // 2/6/2025 19:57:25

  // RFC 2822 / Email date style with timezone offset
  "EEE, dd MMM yyyy HH:mm:ss xx", // Mon, 23 Jun 2025 19:57:25 +0100
  "EEE, dd MMM yyyy HH:mm:ss xxx", // Mon, 23 Jun 2025 19:57:25 +01:00

  // ISO 8601 with timezone
  "yyyy-MM-dd'T'HH:mm:ssxxx", // 2025-06-22T19:57:25+01:00
  "yyyy-MM-dd'T'HH:mm:ss.SSSxxx", // 2025-06-22T19:57:25.123+01:00

  // Just time (if needed)
  "HH:mm:ss", // 19:57:25

  // Add others you observe...
];
