const mongoose = require("mongoose");

const priceHistorySchema = new mongoose.Schema(
  {
    platform: {
      type: String,
      enum: ["amazon", "flipkart"],
      required: true,
    },
    price: {
      type: Number,
      required: true,
      min: 0,
    },
    url: {
      type: String,
      required: true,
    },
    checkedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
);

const productSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },

    amazonPrice: {
      type: Number,
      default: 0,
    },

    flipkartPrice: {
      type: Number,
      default: 0,
    },

    lowestPrice: {
      type: Number,
      default: 0,
    },

    bestPlatform: {
      type: String,
      enum: ["amazon", "flipkart", null],
      default: null,
    },

    amazonUrl: {
      type: String,
      trim: true,
    },

    flipkartUrl: {
      type: String,
      trim: true,
    },

    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },

    targetPrice: {
      type: Number,
      min: 0,
      default: null,
    },

    alertEnabled: {
      type: Boolean,
      default: true,
    },

    priceHistory: {
      type: [priceHistorySchema],
      default: [],
    },

    lastCheckedAt: {
      type: Date,
      default: null,
    },

    lastAlertSentAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

productSchema.methods.syncBestDeal = function syncBestDeal() {
  const prices = [
    { platform: "amazon", price: this.amazonPrice },
    { platform: "flipkart", price: this.flipkartPrice },
  ].filter((offer) => Number.isFinite(offer.price) && offer.price > 0);

  if (!prices.length) {
    this.lowestPrice = 0;
    this.bestPlatform = null;
    return;
  }

  const bestDeal = prices.reduce((lowest, offer) =>
    offer.price < lowest.price ? offer : lowest
  );

  this.lowestPrice = bestDeal.price;
  this.bestPlatform = bestDeal.platform;
};

productSchema.pre("save", function syncBestDealBeforeSave() {
  this.syncBestDeal();
});

module.exports = mongoose.model("Product", productSchema);
