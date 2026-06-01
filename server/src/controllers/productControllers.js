const Product = require("../models/Product");
const { scrapeProductPrices } = require("../services/priceScraper");
const {
  applyScrapedPrices,
  refreshProductById,
} = require("../services/productTrackingService");

// Create Product
const createProduct = async (req, res) => {
  try {
    const { amazonUrl, flipkartUrl, email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email is required for price drop alerts",
      });
    }

    if (!amazonUrl && !flipkartUrl) {
      return res.status(400).json({
        success: false,
        message: "Add at least one Amazon or Flipkart product URL",
      });
    }

    const product = new Product(req.body);
    const scrapeResult = await scrapeProductPrices({ amazonUrl, flipkartUrl });

    applyScrapedPrices(product, scrapeResult.prices);

    if (!product.title) {
      const firstScrapedOffer = Object.values(scrapeResult.prices)[0];
      product.title = firstScrapedOffer?.title || "Tracked product";
    }

    await product.save();

    res.status(201).json({
      success: true,
      message: "Product created successfully",
      data: product,
      scrapeErrors: scrapeResult.errors,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Get All Products
const getProducts = async (req, res) => {
  try {
    const products = await Product.find().sort({ updatedAt: -1 });

    res.status(200).json({
      success: true,
      count: products.length,
      data: products,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Get Single Product
const getProductById = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    res.status(200).json({
      success: true,
      data: product,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Update Product
const updateProduct = async (req, res) => {
  try {
    const product = await Product.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    product.syncBestDeal();
    await product.save();

    res.status(200).json({
      success: true,
      message: "Product updated successfully",
      data: product,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Refresh tracked prices
const refreshProductPrices = async (req, res) => {
  try {
    const result = await refreshProductById(req.params.id);

    if (!result) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Product prices refreshed",
      data: result.product,
      drops: result.drops,
      scrapeErrors: result.scrapeErrors,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Get price history
const getProductHistory = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id).select(
      "title priceHistory"
    );

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    res.status(200).json({
      success: true,
      data: product.priceHistory,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Delete Product
const deleteProduct = async (req, res) => {
  try {
    const product = await Product.findByIdAndDelete(req.params.id);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Product deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

module.exports = {
  createProduct,
  getProducts,
  getProductById,
  getProductHistory,
  refreshProductPrices,
  updateProduct,
  deleteProduct,
};
