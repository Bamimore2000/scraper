// Setup Twitter Client
import { TwitterApi } from "twitter-api-v2";
import dotenv from "dotenv";
dotenv.config();

const twitterClient = new TwitterApi({
  appKey: process.env.TWITTER_API_KEY,
  appSecret: process.env.TWITTER_API_SECRET,
  accessToken: process.env.TWITTER_ACCESS_TOKEN,
  accessSecret: process.env.TWITTER_ACCESS_SECRET,
});

console.log({
  appKey: process.env.TWITTER_API_KEY,
  appSecret: process.env.TWITTER_API_SECRET,
  accessToken: process.env.TWITTER_ACCESS_TOKEN,
  accessSecret: process.env.TWITTER_ACCESS_SECRET,
});
try {
  await twitterClient.v2.tweet(
    "This is a test tweet from the Twitter API client."
  );
  console.log("🐦 Posted batch tweet.");
} catch (err) {
  console.error("❌ Error posting batch tweet:", err);
}
