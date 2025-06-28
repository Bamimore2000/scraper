import puppeteer from "puppeteer-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
import axios from "axios";

import dotenv from "dotenv";

dotenv.config();

puppeteer.use(StealthPlugin());

const BASE_URL = process.env.FASTAPI_URL; // Your backend filter API URL

async function filterHeadlines(headlines) {
  try {
    const response = await axios.post(BASE_URL, { headlines });
    return response.data;
  } catch (error) {
    console.error("Error calling filter-headlines endpoint:", error.message);
    throw error;
  }
}

export async function scrapeGuardian() {
  const browser = await puppeteer.launch({
    headless: true,

    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  const page = await browser.newPage();

  await page.goto("https://guardian.ng/news/", {
    waitUntil: "networkidle2",
  });

  // Extract all headlines and links from h1.post-title > a
  const results = await page.evaluate(() => {
    const anchors = Array.from(document.querySelectorAll("h1.post-title a"));
    return anchors.map((a) => ({
      text: a.textContent.trim(),
      link: a.href,
    }));
  });

  // Filter headlines via your backend API
  const filteredHeadlines = await filterHeadlines(results);

  const detailedResults = [];

  for (const item of filteredHeadlines) {
    try {
      await page.goto(item.link, { waitUntil: "networkidle2" });

      const data = await page.evaluate(() => {
        const titleEl = document.querySelector("h1.post-title");
        const dateEl = document.querySelector(".post-date");
        const imageEl = document.querySelector("figure.featured-image img");
        const leadEl = document.querySelector(".post-content p");

        return {
          title: titleEl ? titleEl.textContent.trim() : null,
          date: dateEl ? dateEl.textContent.trim() : null,
          imageurl: imageEl ? imageEl.src : null,
          lead: leadEl ? leadEl.textContent.trim() : null,
        };
      });

      detailedResults.push({
        text: item.text,
        link: item.link,
        ...data,
      });
    } catch (error) {
      console.error(`Error scraping article ${item.link}:`, error.message);
    }
  }

  await browser.close();

  return detailedResults;
}
