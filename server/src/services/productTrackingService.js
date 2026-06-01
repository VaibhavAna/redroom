const Product = require("../models/Product");
const { sendPriceDropEmail } = require("./emailService");
const { scrapeProductPrices } = require("./priceScraper");

const PRICE_FIELDS = {
  amazon: "amazonPrice",
  flipkart: "flipkartPrice",
};

const applyScrapedPrices = (product, scrapedPrices) => {
  Object.entries(scrapedPrices).forEach(([platform, offer]) => {
    product[PRICE_FIELDS[platform]] = offer.price;
    product.priceHistory.push({
      platform,
      price: offer.price,
      url: offer.url,
      checkedAt: offer.checkedAt,
    });
  });

  product.lastCheckedAt = new Date();
  product.syncBestDeal();
};

const detectDrops = (previousPrices, product, scrapedPrices) =>
  Object.keys(scrapedPrices)
    .map((platform) => {
      const previousPrice = previousPrices[platform];
      const currentPrice = product[PRICE_FIELDS[platform]];

      if (!previousPrice || !currentPrice || currentPrice >= previousPrice) {
        return null;
      }

      return {
        platform,
        previousPrice,
        currentPrice,
      };
    })
    .filter(Boolean);

const refreshProductPrices = async (product) => {
  const previousPrices = {
    amazon: product.amazonPrice,
    flipkart: product.flipkartPrice,
  };

  const scrapeResult = await scrapeProductPrices({
    amazonUrl: product.amazonUrl,
    flipkartUrl: product.flipkartUrl,
  });

  applyScrapedPrices(product, scrapeResult.prices);
  const drops = detectDrops(previousPrices, product, scrapeResult.prices);

  if (drops.length) {
    await sendPriceDropEmail(product, drops);
    product.lastAlertSentAt = new Date();
  }

  await product.save();

  return {
    product,
    drops,
    scrapeErrors: scrapeResult.errors,
  };
};

const refreshProductById = async (id) => {
  const product = await Product.findById(id);

  if (!product) {
    return null;
  }

  return refreshProductPrices(product);
};

module.exports = {
  applyScrapedPrices,
  refreshProductById,
  refreshProductPrices,
};
