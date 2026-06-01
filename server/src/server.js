require("dotenv").config();

const app = require("./app");
const connectDB = require("./config/db");
const startPriceTrackerJob = require("./jobs/priceTrackerJob");

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  await connectDB();
  startPriceTrackerJob();

  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
};

startServer();
