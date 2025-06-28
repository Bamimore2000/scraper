import { scrapePunch } from "./punch.js";
import { scrapeDailyTrust } from "./dailytrust.js";
import { scrapeSaharaReporters } from "./saharaReporters.js";
import { scrapeVanguard } from "./scrapeVanguard.js";
import dotenv from "dotenv";
dotenv.config();

export const scrappers = {
  vanguard: scrapeVanguard,
  punch: scrapePunch,
  dailyTrust: scrapeDailyTrust,
  saharaReporters: scrapeSaharaReporters,
};
