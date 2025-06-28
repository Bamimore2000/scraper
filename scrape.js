// scripts/scrape.js

import express from "express";
import mongoose from "mongoose";
import dotenv from "dotenv";
import { connectDB } from "./utils/db.js";
import { scrappers } from "./websites/scrapper.js";
import Article from "./models/article_model.js";
import { normalizeDatesInItems } from "./utils/map.js";

dotenv.config();

async function saveToDB(allArticles) {
  let savedCount = 0;
  let skippedCount = 0;

  for (const article of allArticles) {
    try {
      await Article.updateOne(
        { link: article.link },
        { $set: article },
        { upsert: true }
      );
      savedCount++;
    } catch (err) {
      if (err.code === 11000) {
        skippedCount++;
      } else {
        console.error(`❌ Error saving article: ${article.link}`, err);
      }
    }
  }

  console.log(`✅ Saved: ${savedCount}, ⏭️ Skipped: ${skippedCount}`);
}

async function runAllScrapers() {
  let allResults = [];

  for (const [name, scraperFunc] of Object.entries(scrappers)) {
    try {
      console.log(`Starting scrape for: ${name}`);
      const data = await scraperFunc();
      const results = normalizeDatesInItems(data);
      console.log(`Scraped ${results.length} articles from ${name}`);
      allResults = allResults.concat(results);
    } catch (err) {
      console.error(`Error scraping ${name}:`, err);
    }
  }

  await saveToDB(allResults);
}

try {
  await connectDB();
  await runAllScrapers();
  await mongoose.connection.close();
  console.log("✅ Script finished and DB connection closed.");
} catch (err) {
  console.error("❌ Script failed:", err);
  process.exit(1);
}
