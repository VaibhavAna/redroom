const mongoose = require("mongoose");

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

    amazonUrl: {
      type: String,
    },

    flipkartUrl: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Product", productSchema);