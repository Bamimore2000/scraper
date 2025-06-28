import puppeteer from "puppeteer-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
import axios from "axios";
const BASE_URL = process.env.FASTAPI_URL;
import dotenv from "dotenv";
dotenv.config();

puppeteer.use(StealthPlugin());
async function filterHeadlines(headlines) {
  try {
    const response = await axios.post(BASE_URL, {
      headlines,
    });
    return response.data;
  } catch (error) {
    console.error("Error calling filter-headlines endpoint:", error.message);
    throw error;
  }
}

export async function scrapeDailyTrust() {
  const browser = await puppeteer.launch({
    headless: true, // run in headless mode (no visible UI)
    executablePath: executablePath(),
    args: ["--no-sandbox", "--disable-setuid-sandbox"], // fix sandbox error on Linux
  });

  const page = await browser.newPage();

  await page.goto("https://dailytrust.com/topics/news/", {
    waitUntil: "networkidle2",
  });

  // Extract initial headlines array
  const results = await page.evaluate(() => {
    const items = [];

    // 1. Hero title anchor
    const heroTitleAnchor = document.querySelector(".hero__title a");
    if (heroTitleAnchor) {
      items.push({
        text: heroTitleAnchor.textContent.trim(),
        link: heroTitleAnchor.href,
      });
    }

    // 2. Hero side: two anchors
    const heroSide = document.querySelector(".hero_side");
    if (heroSide) {
      // a) anchor inside hero_side
      const heroSideAnchor = heroSide.querySelector("a");
      if (heroSideAnchor) {
        items.push({
          text:
            heroSideAnchor.title.trim() || heroSideAnchor.textContent.trim(),
          link: heroSideAnchor.href,
        });
      }
      // b) two h3 with class h2 inside hero_side
      const h3s = heroSide.querySelectorAll("h3.h2");
      h3s.forEach((h3) => {
        const a = h3.querySelector("a");
        if (a) {
          items.push({
            text: a.textContent.trim(),
            link: a.href,
          });
        }
      });
    }

    // 3. All anchors inside hero_latest
    const heroLatestAnchors = document.querySelectorAll(".hero_latest a");
    heroLatestAnchors.forEach((a) => {
      items.push({
        text: a.title.trim() || a.textContent.trim(),
        link: a.href,
      });
    });

    // 4. All anchors inside category__body.category__compact.category__desktop
    const categoryAnchors = document.querySelectorAll(
      ".category__body.category__compact.category__desktop a"
    );
    categoryAnchors.forEach((a) => {
      items.push({
        text: a.title.trim() || a.textContent.trim(),
        link: a.href,
      });
    });

    // Remove duplicates by link (optional, can be done later)
    const uniqueItems = [];
    const seen = new Set();
    for (const item of items) {
      if (!seen.has(item.link)) {
        seen.add(item.link);
        uniqueItems.push(item);
      }
    }

    return uniqueItems;
  });

  // Call backend filter API to get security-related headlines
  const filteredHeadlines = await filterHeadlines(results);

  const detailedResults = [];

  for (const item of filteredHeadlines) {
    try {
      await page.goto(item.link, { waitUntil: "networkidle2" });

      const data = await page.evaluate(() => {
        const titleEl = document.querySelector("h1.h1v1");
        const dateEl = document.querySelector(".post-time");
        const imageEl = document.querySelector(".post-thumbnail img");
        const leadEl = document.querySelector(".article__body.text-justify p");

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
      console.error(`Error scraping ${item.link}:`, error.message);
    }
  }

  await browser.close();

  return detailedResults;
}
