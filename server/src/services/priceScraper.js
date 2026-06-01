const cheerio = require("cheerio");

const PLATFORM_CONFIG = {
  amazon: {
    titleSelectors: ["#productTitle", "#title", "h1", "meta[property='og:title']"],
    priceSelectors: [
      ".a-price .a-offscreen",
      "#priceblock_ourprice",
      "#priceblock_dealprice",
      "#corePrice_feature_div .a-offscreen",
      "[data-a-color='price'] .a-offscreen",
      "[itemprop='price']",
      "meta[property='product:price:amount']",
    ],
  },
  flipkart: {
    titleSelectors: [
      ".VU-ZEz",
      ".B_NuCI",
      "span.B_NuCI",
      "h1 span",
      "h1",
      "meta[property='og:title']",
    ],
    priceSelectors: [
      "._30jeq3",
      "._16Jk6d",
      ".Nx9bqj",
      "._25b18c .Nx9bqj",
      "[class*='Nx9bqj']",
      "[class*='_30jeq3']",
      "[itemprop='price']",
      "meta[property='product:price:amount']",
    ],
  },
};

const REQUEST_HEADERS = {
  accept:
    "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
  "accept-language": "en-IN,en;q=0.9",
  "cache-control": "no-cache",
  pragma: "no-cache",
  "sec-fetch-dest": "document",
  "sec-fetch-mode": "navigate",
  "sec-fetch-site": "none",
  "upgrade-insecure-requests": "1",
  "user-agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0 Safari/537.36",
};

const parsePrice = (value = "") => {
  const normalized = value
    .replace(/,/g, "")
    .match(/(?:Rs\.?|INR|\u20b9)?\s*(\d+(?:\.\d{1,2})?)/i);

  return normalized ? Number(normalized[1]) : null;
};

const firstText = ($, selectors) => {
  for (const selector of selectors) {
    const element = $(selector).first();
    const text = (element.attr("content") || element.attr("value") || element.text()).trim();

    if (text) {
      return text.replace(/\s+/g, " ");
    }
  }

  return null;
};

const findStructuredPrice = ($) => {
  const candidates = [
    "[itemprop='price']",
    "meta[property='product:price:amount']",
    "meta[property='og:price:amount']",
    "meta[name='twitter:data1']",
  ];

  for (const selector of candidates) {
    const price = parsePrice(firstText($, [selector]) || "");

    if (price) {
      return price;
    }
  }

  let jsonLdPrice = null;

  $("script[type='application/ld+json']").each((_, element) => {
    if (jsonLdPrice) {
      return;
    }

    try {
      const data = JSON.parse($(element).text());
      const items = Array.isArray(data) ? data : [data];

      for (const item of items) {
        const offers = Array.isArray(item.offers) ? item.offers[0] : item.offers;
        const price = parsePrice(String(offers?.price || ""));

        if (price) {
          jsonLdPrice = price;
          break;
        }
      }
    } catch {
      // Some product pages include malformed JSON-LD. Keep trying other sources.
    }
  });

  return jsonLdPrice;
};

const findVisibleRupeePrice = (html) => {
  const matches = [
    ...html.matchAll(/(?:\u20b9|Rs\.?)\s*([1-9]\d{2,7}(?:,\d{2,3})*)/gi),
  ]
    .map((match) => parsePrice(match[0]))
    .filter((price) => price && price > 99);

  return matches.length ? Math.min(...matches) : null;
};

const isBlockedPage = ($, platform) => {
  const pageText = $("body").text().toLowerCase();

  if (platform === "flipkart") {
    return (
      pageText.includes("login") &&
      pageText.includes("enter email/mobile number") &&
      !pageText.includes("add to cart")
    );
  }

  return pageText.includes("captcha") || pageText.includes("robot check");
};

const scrapePlatform = async (platform, url) => {
  if (!url) {
    return null;
  }

  const config = PLATFORM_CONFIG[platform];
  const response = await fetch(url, { headers: REQUEST_HEADERS });

  if (!response.ok) {
    throw new Error(`${platform} returned ${response.status}`);
  }

  const html = await response.text();
  const $ = cheerio.load(html);

  if (isBlockedPage($, platform)) {
    throw new Error(`${platform} blocked the scrape request`);
  }

  const rawPrice = firstText($, config.priceSelectors);
  const price =
    parsePrice(rawPrice || "") || findStructuredPrice($) || findVisibleRupeePrice(html);

  if (!price) {
    throw new Error(`Could not find a ${platform} price on the page`);
  }

  return {
    platform,
    url,
    title: firstText($, config.titleSelectors),
    price,
    checkedAt: new Date(),
  };
};

const scrapeProductPrices = async ({ amazonUrl, flipkartUrl }) => {
  const targets = [
    ["amazon", amazonUrl],
    ["flipkart", flipkartUrl],
  ].filter(([, url]) => Boolean(url));

  const results = await Promise.allSettled(
    targets.map(([platform, url]) => scrapePlatform(platform, url))
  );

  return results.reduce(
    (summary, result, index) => {
      const [platform] = targets[index];

      if (result.status === "fulfilled" && result.value) {
        summary.prices[platform] = result.value;
      } else {
        summary.errors[platform] = result.reason.message;
      }

      return summary;
    },
    { prices: {}, errors: {} }
  );
};

module.exports = {
  scrapeProductPrices,
};
