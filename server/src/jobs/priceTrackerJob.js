const cron = require("node-cron");
const Product = require("../models/Product");
const { refreshProductPrices } = require("../services/productTrackingService");

const startPriceTrackerJob = () => {
  if (process.env.PRICE_TRACKER_CRON_ENABLED === "false") {
    return;
  }

  const schedule = process.env.PRICE_CHECK_CRON || "0 */6 * * *";

  cron.schedule(schedule, async () => {
    const products = await Product.find({ alertEnabled: true });

    for (const product of products) {
      try {
        await refreshProductPrices(product);
      } catch (error) {
        console.error(`Price refresh failed for ${product._id}: ${error.message}`);
      }
    }
  });

  console.log(`Price tracker job scheduled: ${schedule}`);
};

module.exports = startPriceTrackerJob;
