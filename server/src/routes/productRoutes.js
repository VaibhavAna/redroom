const express = require("express");

const {
  createProduct,
  getProducts,
  getProductById,
  getProductHistory,
  refreshProductPrices,
  updateProduct,
  deleteProduct,
} = require("../controllers/productControllers");

const router = express.Router();

router.post("/", createProduct);

router.get("/", getProducts);

router.get("/:id", getProductById);

router.get("/:id/history", getProductHistory);

router.put("/:id", updateProduct);

router.post("/:id/refresh", refreshProductPrices);

router.delete("/:id", deleteProduct);

module.exports = router;


//Hello to check all the routes

//