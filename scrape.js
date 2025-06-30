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
    newArticles.slice(0, 6).map(async (a) => {
      // allow up to 6 so we can split
      const shortUrl = await shortenUrl(a.link);
      return { ...a, shortUrl };
    })
  );

  // Footer message
  const footer = "\nVisit securenaija.com for more";

  // Try to create 1 or 2 tweets to fit all headlines
  // 1st: try all in 1 tweet, if too long split in two roughly equal parts

  // Helper to build tweet message
  const buildTweet = (articles) => {
    const headlines = articles
      .map((a) => `• ${a.title} [${a.shortUrl}]`)
      .join("\n");
    return `🛡️ New security news entries:\n${headlines}${footer}`;
  };

  // First, try all in one tweet
  let tweet1 = buildTweet(articlesWithShortLinks);
  if (tweet1.length <= 280) {
    try {
      await twitterClient.v2.tweet(tweet1);
      console.log("🐦 Posted 1 batch tweet.");
    } catch (err) {
      console.error("❌ Error posting batch tweet:", err);
    }
    return;
  }

  // If too long, split roughly in half and try two tweets
  const half = Math.ceil(articlesWithShortLinks.length / 2);
  let tweetPart1 = buildTweet(articlesWithShortLinks.slice(0, half));
  let tweetPart2 = buildTweet(articlesWithShortLinks.slice(half));

  // Check lengths and adjust if necessary by dropping headlines from end
  while (
    tweetPart1.length > 280 &&
    articlesWithShortLinks.slice(0, half).length
  ) {
    articlesWithShortLinks.splice(half - 1, 1); // remove last from first half
    tweetPart1 = buildTweet(articlesWithShortLinks.slice(0, half - 1));
  }
  while (tweetPart2.length > 280 && articlesWithShortLinks.slice(half).length) {
    articlesWithShortLinks.splice(articlesWithShortLinks.length - 1, 1); // remove last from second half
    tweetPart2 = buildTweet(articlesWithShortLinks.slice(half));
  }

  try {
    if (tweetPart1.length <= 280 && tweetPart1.trim().length > 0) {
      await twitterClient.v2.tweet(tweetPart1);
      console.log("🐦 Posted first batch tweet.");
    } else {
      console.warn("⚠️ Could not fit first tweet within limit.");
    }
    if (tweetPart2.length <= 280 && tweetPart2.trim().length > 0) {
      await twitterClient.v2.tweet(tweetPart2);
      console.log("🐦 Posted second batch tweet.");
    } else {
      console.warn("⚠️ Could not fit second tweet within limit or no content.");
    }
  } catch (err) {
    console.error("❌ Error posting batch tweets:", err);
  }
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
