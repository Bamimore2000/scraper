import { scrapePunch } from "./punch.js";
import { scrapeDailyTrust } from "./dailytrust.js";
import { scrapeSaharaReporters } from "./saharaReporters.js";
import { scrapeVanguard } from "./scrapeVanguard.js";
import dotenv from "dotenv";
import { scrapeGuardian } from "./guardian.js";
dotenv.config();

export const scrappers = {
  guardian: scrapeGuardian,
  vanguard: scrapeVanguard,
  punch: scrapePunch,
  dailyTrust: scrapeDailyTrust,
  saharaReporters: scrapeSaharaReporters,
};
