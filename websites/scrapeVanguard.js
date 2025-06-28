import puppeteer from "puppeteer-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
import axios from "axios";
import dotenv from "dotenv";

dotenv.config();
puppeteer.use(StealthPlugin());
const BASE_URL = process.env.FASTAPI_URL;
async function filterHeadlines(headlines) {
  try {
    const response = await axios.post(BASE_URL, { headlines });
    return response.data;
  } catch (error) {
    console.error("Error calling filter-headlines endpoint:", error.message);
    throw error;
  }
}

export async function scrapeVanguard() {
  const browser = await puppeteer.launch({
    headless: true, // run in headless mode (no visible UI)

    args: ["--no-sandbox", "--disable-setuid-sandbox"], // fix sandbox error on Linux
  });

  const page = await browser.newPage();
  await page.goto("https://punchng.com/topics/news/", {
    waitUntil: "networkidle2",
    timeout: 60000,
  });

  // Extract links and text from .post-title a
  const headlines = await page.evaluate(() => {
    const items = [];
    const anchors = document.querySelectorAll(".post-title a");
    anchors.forEach((a) => {
      const text = a.textContent?.trim();
      const link = a.href;
      if (text && link) {
        items.push({ text, link });
      }
    });
    return items;
  });

  const filteredHeadlines = await filterHeadlines(headlines);
  const results = [];

  for (const item of filteredHeadlines) {
    try {
      await page.goto(item.link, { waitUntil: "networkidle2", timeout: 60000 });

      const data = await page.evaluate(() => {
        const titleEl = document.querySelector("h1.post-title");
        const dateEl = document.querySelector("span.post-date");
        const imageEl = document.querySelector(
          ".post-image-wrapper figure img"
        );
        const leadEl = document.querySelector(
          ".ai-optimize-8.ai-optimize-introduction"
        );

        return {
          title: titleEl?.textContent?.trim() || null,
          date: dateEl?.textContent?.trim() || null,
          imageurl: imageEl?.src || null,
          lead: leadEl?.textContent?.trim() || null,
        };
      });

      results.push({
        text: item.text,
        link: item.link,
        ...data,
      });
    } catch (error) {
      console.error(`Error scraping ${item.link}:`, error.message);
    }
  }

  await browser.close();
  return results;
}
