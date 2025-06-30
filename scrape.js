// scripts/scrape.js

import mongoose from "mongoose";
import dotenv from "dotenv";
import { connectDB } from "./utils/db.js";
import { scrappers } from "./websites/scrapper.js";
import Article from "./models/article_model.js";
import { normalizeDatesInItems } from "./utils/map.js";
import { TwitterApi } from "twitter-api-v2";
import { shortenUrl } from "./utils/tinyurl.js";

dotenv.config();

// Setup Twitter Client
const twitterClient = new TwitterApi({
  appKey: process.env.TWITTER_API_KEY,
  appSecret: process.env.TWITTER_API_SECRET,
  accessToken: process.env.TWITTER_ACCESS_TOKEN,
  accessSecret: process.env.TWITTER_ACCESS_SECRET,
});

// ...existing code...

async function postBatchToTwitter(newArticles) {
  if (!newArticles.length) return;

  // Shorten URLs in parallel (limit to 3)
  const articlesWithShortLinks = await Promise.all(
    newArticles.slice(0, 3).map(async (a) => {
      const shortUrl = await shortenUrl(a.link);
      return { ...a, shortUrl };
    })
  );

  let articlesToPost = [...articlesWithShortLinks];

  while (articlesToPost.length) {
    const headlines = articlesToPost
      .map((a) => `• ${a.title} [${a.shortUrl}]`)
      .join("\n");

    const message = `🛡️ New security news entries:\n${headlines}`;

    if (message.length <= 280) {
      try {
        await twitterClient.v2.tweet(message);
        console.log("🐦 Posted batch tweet.");
      } catch (err) {
        console.error("❌ Error posting batch tweet:", err);
      }
      return;
    }

    // Remove the last headline if too long
    articlesToPost.pop();
  }

  console.warn("⚠️ Could not fit any headlines within tweet limit.");
}

// Save articles to MongoDB and track new ones
async function saveToDB(allArticles) {
  let savedCount = 0;
  let skippedCount = 0;
  const newArticles = [];

  for (const article of allArticles) {
    try {
      const result = await Article.updateOne(
        { link: article.link },
        { $setOnInsert: article },
        { upsert: true }
      );

      if (result.upsertedCount > 0) {
        savedCount++;
        newArticles.push(article);
      } else {
        skippedCount++;
      }
    } catch (err) {
      console.error(`❌ Error saving article: ${article.link}`, err);
    }
  }

  console.log(`✅ Saved: ${savedCount}, ⏭️ Skipped: ${skippedCount}`);

  await postBatchToTwitter(newArticles);
}

// Run all site scrapers and store results
async function runAllScrapers() {
  let allResults = [];

  for (const [name, scraperFunc] of Object.entries(scrappers)) {
    try {
      console.log(`🔍 Starting scrape for: ${name}`);
      const data = await scraperFunc();
      const results = normalizeDatesInItems(data);
      console.log(`🗞️ Scraped ${results.length} articles from ${name}`);
      allResults = allResults.concat(results);
    } catch (err) {
      console.error(`❌ Error scraping ${name}:`, err);
    }
  }

  await saveToDB(allResults);
}

// Execute script
try {
  await connectDB();
  await runAllScrapers();
  await mongoose.connection.close();
  console.log("✅ Script finished and DB connection closed.");
  process.exit(0); // Force exit
} catch (err) {
  console.error("❌ Script failed:", err);
  process.exit(1);
}
