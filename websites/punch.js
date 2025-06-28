// punch.js
import puppeteer from "puppeteer-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
import axios from "axios";
import { executablePath } from "puppeteer";

import dotenv from "dotenv";

dotenv.config();
const BASE_URL = process.env.FASTAPI_URL;

puppeteer.use(StealthPlugin());

async function filterHeadlines(headlines) {
  try {
    const response = await axios.post(BASE_URL, { headlines });
    return response.data; // filtered headlines [{ text, link, confidence }]
  } catch (error) {
    console.error("Error calling filter-headlines endpoint:", error.message);
    throw error;
  }
}

/**
 * Scrapes Punch website headlines, filters security-related ones,
 * scrapes detailed info for each filtered headline, and returns array.
 */
export async function scrapePunch() {
  const browser = await puppeteer.launch({
    headless: true, // run in headless mode (no visible UI)
    executablePath: executablePath(),
    args: ["--no-sandbox", "--disable-setuid-sandbox"], // fix sandbox error on Linux
  });

  const page = await browser.newPage();

  // Go to Punch top stories page
  await page.goto(
    "https://www.vanguardngr.com/category/top-stories/?posts_per_page=18",
    { waitUntil: "networkidle2" }
  );

  // Scrape headlines + links from h3.entry-title > a
  const results = await page.evaluate(() => {
    const items = [];
    const h3Elements = document.querySelectorAll("h3.entry-title");

    h3Elements.forEach((h3) => {
      const a = h3.querySelector("a");
      if (a) {
        items.push({
          text: a.textContent.trim(),
          link: a.href,
        });
      }
    });

    return items;
  });

  // Filter headlines through your Python model API
  const filteredHeadlines = await filterHeadlines(results);

  const detailedResults = [];

  // For each filtered headline, scrape detailed article data
  for (const item of filteredHeadlines) {
    try {
      await page.goto(item.link, { waitUntil: "networkidle2" });

      const data = await page.evaluate(() => {
        const titleEl = document.querySelector(".entry-heading");
        const imageEl = document.querySelector(".entry-thumbnail-wrapper img");
        const leadEl = document.querySelector(".entry-content-inner-wrapper p");
        const dateEl = document.querySelector(".entry-excerpt-date");

        return {
          title: titleEl?.textContent.trim() ?? null,
          imageurl: imageEl?.src ?? null,
          lead: leadEl?.textContent.trim() ?? null,
          date: dateEl?.textContent.trim() ?? null,
        };
      });

      detailedResults.push({
        text: item.text,
        link: item.link,
        ...data,
      });
    } catch (err) {
      console.error(`Error scraping details for ${item.link}:`, err.message);
    }
  }

  await browser.close();

  return detailedResults;
}
