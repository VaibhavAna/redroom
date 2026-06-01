# RedRoom

A MERN Stack Price Comparison and Price Tracking Platform.

## Features

- Compare prices across multiple e-commerce websites
- Track historical prices
- Detect price drops
- Email price drop alerts
- Price trend analytics

## Tech Stack

### Frontend
- React
- Vite
- Axios
- Tailwind CSS

### Backend
- Node.js
- Express.js

### Database
- MongoDB

### Architecture
- MVC Pattern

## Future Enhancements
- Browser extension
- AI-based price prediction
- Multi-vendor comparison

## Backend API

Base URL: `/api/products`

- `POST /` - add a product to track with `email`, `amazonUrl`, `flipkartUrl`, and optional `targetPrice`
- `GET /` - list tracked products
- `GET /:id` - get one tracked product
- `PUT /:id` - update tracking details
- `POST /:id/refresh` - scrape the latest Amazon/Flipkart prices and send an email if a price dropped
- `GET /:id/history` - get stored price history
- `DELETE /:id` - remove a tracked product

Example request:

```json
{
  "title": "iPhone 15",
  "email": "buyer@example.com",
  "amazonUrl": "https://www.amazon.in/...",
  "flipkartUrl": "https://www.flipkart.com/...",
  "targetPrice": 60000
}
```

## Email Alerts

Copy `server/.env.example` to `server/.env` and fill in `SMTP_HOST`, `SMTP_USER`, and `SMTP_PASS`.

If SMTP is not configured, RedRoom will still track prices and print the email alert payload in the server console instead of sending it.

## Run Locally

Backend:

```bash
cd server
npm run dev
```

Frontend:

```bash
cd client
npm run dev
```

Open `http://127.0.0.1:5173`. The Vite dev server proxies `/api` requests to `http://127.0.0.1:5000`.
