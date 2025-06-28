import puppeteer from "puppeteer-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
import axios from "axios";
import dotenv from "dotenv";

dotenv.config();
const BASE_URL = process.env.FASTAPI_URL;

puppeteer.use(StealthPlugin());

async function filterHeadlines(headlines) {
  try {
    const response = await axios.post(BASE_URL, { headlines });
    return response.data;
  } catch (error) {
    console.error("Error calling filter-headlines endpoint:", error.message);
    throw error;
  }
}

export async function scrapeSaharaReporters() {
  const browser = await puppeteer.launch({
    headless: true, // run in headless mode (no visible UI)

    args: ["--no-sandbox", "--disable-setuid-sandbox"], // fix sandbox error on Linux
  });

  const page = await browser.newPage();

  await page.goto(
    "https://saharareporters.com/articles?f%5B0%5D=article_type%3A11",
    { waitUntil: "networkidle2" }
  );

  // Extract all h2.title.is-3 anchors with text and href
  const articles = await page.evaluate(() => {
    const nodes = document.querySelectorAll("h2.title.is-3 a");
    const results = [];
    nodes.forEach((a) => {
      results.push({
        text: a.textContent.trim(),
        link: a.href,
      });
    });
    return results;
  });

  // Deduplicate links
  const uniqueArticles = [];
  const seen = new Set();
  for (const art of articles) {
    if (!seen.has(art.link)) {
      seen.add(art.link);
      uniqueArticles.push(art);
    }
  }

  // Call backend filter API to filter headlines
  let filteredArticles = uniqueArticles;
  try {
    filteredArticles = await filterHeadlines(uniqueArticles);
  } catch (err) {
    console.warn("Filter API failed, proceeding with unfiltered articles.");
  }

  // Scrape details for each filtered article
  const detailedResults = [];
  for (const article of filteredArticles) {
    try {
      await page.goto(article.link, { waitUntil: "networkidle2" });

      const data = await page.evaluate(() => {
        const titleSpan = document.querySelector(
          "h1.is-1.is-size-2-tablet-only.is-size-3-mobile.has-padding-top-20-desktop.has-padding-top-10-tablet-only.has-padding-top-5-mobile.has-padding-left-10-touch.has-padding-right-10-touch span"
        );

        const imageEl = document.querySelector(
          "div.group-header.column.is-12 img"
        );

        const dateDiv = document.querySelector("div.group-left.column.is-3");
        let dateText = null;
        if (dateDiv && dateDiv.children.length > 0) {
          const firstChild = dateDiv.children[0];
          if (firstChild && firstChild.children.length > 0) {
            const grandChild = firstChild.children[0];
            dateText = grandChild ? grandChild.textContent.trim() : null;
          }
        }

        const leadP = document.querySelector("div.content.lead p");

        return {
          title: titleSpan ? titleSpan.textContent.trim() : null,
          date: dateText,
          imageurl: imageEl ? imageEl.src : null,
          lead: leadP ? leadP.textContent.trim() : null,
        };
      });

      detailedResults.push({
        text: article.text,
        link: article.link,
        ...data,
      });
    } catch (error) {
      console.error(`Error scraping ${article.link}:`, error.message);
    }
  }

  await browser.close();

  return detailedResults;
}
