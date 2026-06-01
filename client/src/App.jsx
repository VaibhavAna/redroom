import { useEffect, useMemo, useState } from "react";
import {
  createProduct,
  deleteProduct,
  getProductHistory,
  getProducts,
  refreshProduct,
  updateProduct,
} from "./api";

const emptyForm = {
  title: "",
  email: "",
  amazonUrl: "",
  flipkartUrl: "",
  targetPrice: "",
};

const currency = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

const formatPrice = (value) => {
  const price = Number(value);
  return price > 0 ? currency.format(price) : "Waiting";
};

const formatDate = (value) =>
  value
    ? new Intl.DateTimeFormat("en-IN", {
        day: "2-digit",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      }).format(new Date(value))
    : "Not checked";

const formatScrapeErrors = (scrapeErrors = {}) => {
  const entries = Object.entries(scrapeErrors);

  if (!entries.length) {
    return "";
  }

  return entries
    .map(([platform, reason]) => `${platform}: ${reason}`)
    .join(" | ");
};

function App() {
  const [products, setProducts] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [selectedProductId, setSelectedProductId] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [refreshingId, setRefreshingId] = useState(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const selectedProduct = useMemo(
    () => products.find((product) => product._id === selectedProductId),
    [products, selectedProductId]
  );

  const stats = useMemo(() => {
    const tracked = products.length;
    const bestDeals = products.filter((product) => product.bestPlatform).length;
    const alerts = products.filter((product) => product.alertEnabled).length;
    const lowest = products.reduce((currentLowest, product) => {
      if (!product.lowestPrice) return currentLowest;
      if (!currentLowest) return product.lowestPrice;
      return Math.min(currentLowest, product.lowestPrice);
    }, 0);

    return { tracked, bestDeals, alerts, lowest };
  }, [products]);

  const loadProducts = async () => {
    setLoading(true);
    setError("");

    try {
      const nextProducts = await getProducts();
      setProducts(nextProducts);

      if (!selectedProductId && nextProducts.length) {
        setSelectedProductId(nextProducts[0]._id);
      }
    } catch (apiError) {
      setError(
        apiError.response?.data?.message ||
          "Could not load products. Check that the backend is running."
      );
    } finally {
      setLoading(false);
    }
  };

  const loadHistory = async (productId) => {
    if (!productId) {
      setHistory([]);
      return;
    }

    try {
      setHistory(await getProductHistory(productId));
    } catch {
      setHistory([]);
    }
  };

  useEffect(() => {
    loadProducts();
  }, []);

  useEffect(() => {
    loadHistory(selectedProductId);
  }, [selectedProductId]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    setMessage("");

    try {
      const payload = {
        ...form,
        targetPrice: form.targetPrice ? Number(form.targetPrice) : null,
      };
      const response = await createProduct(payload);
      const scrapeErrors = formatScrapeErrors(response.scrapeErrors);

      setMessage(
        scrapeErrors
          ? `Product saved. Could not scrape: ${scrapeErrors}`
          : "Product tracking started."
      );
      setForm(emptyForm);
      await loadProducts();
      setSelectedProductId(response.data._id);
    } catch (apiError) {
      setError(apiError.response?.data?.message || "Could not save product.");
    } finally {
      setSaving(false);
    }
  };

  const handleRefresh = async (productId) => {
    setRefreshingId(productId);
    setError("");
    setMessage("");

    try {
      const response = await refreshProduct(productId);
      const scrapeErrors = formatScrapeErrors(response.scrapeErrors);

      setMessage(
        scrapeErrors
          ? `Prices refreshed with scrape issues: ${scrapeErrors}`
          : response.drops?.length
          ? "Price drop detected and alert processed."
          : "Prices refreshed."
      );
      await loadProducts();
      await loadHistory(productId);
    } catch (apiError) {
      setError(apiError.response?.data?.message || "Could not refresh prices.");
    } finally {
      setRefreshingId(null);
    }
  };

  const handleDelete = async (productId) => {
    setError("");
    setMessage("");

    try {
      await deleteProduct(productId);
      setMessage("Product removed.");
      setSelectedProductId((currentId) =>
        currentId === productId ? null : currentId
      );
      await loadProducts();
    } catch (apiError) {
      setError(apiError.response?.data?.message || "Could not delete product.");
    }
  };

  const handleToggleAlert = async (product) => {
    try {
      const response = await updateProduct(product._id, {
        alertEnabled: !product.alertEnabled,
      });

      setProducts((currentProducts) =>
        currentProducts.map((item) =>
          item._id === product._id ? response.data : item
        )
      );
    } catch (apiError) {
      setError(apiError.response?.data?.message || "Could not update alert.");
    }
  };

  return (
    <main className="app-shell">
      <section className="workspace">
        <header className="topbar">
          <div>
            <p className="eyebrow">RedRoom</p>
            <h1>Price command center</h1>
          </div>
          <div className="status-pill">
            <span className="status-dot" />
            Amazon + Flipkart
          </div>
        </header>

        <section className="metrics" aria-label="Tracking summary">
          <article>
            <span>Tracked</span>
            <strong>{stats.tracked}</strong>
          </article>
          <article>
            <span>Best deals</span>
            <strong>{stats.bestDeals}</strong>
          </article>
          <article>
            <span>Alerts on</span>
            <strong>{stats.alerts}</strong>
          </article>
          <article>
            <span>Lowest found</span>
            <strong>{formatPrice(stats.lowest)}</strong>
          </article>
        </section>

        {(message || error) && (
          <div className={error ? "notice error" : "notice"} role="status">
            {error || message}
          </div>
        )}

        <section className="layout">
          <form className="tracker-form" onSubmit={handleSubmit}>
            <div className="section-title">
              <h2>Add tracker</h2>
              <span>Email alerts</span>
            </div>

            <label>
              Product name
              <input
                name="title"
                value={form.title}
                onChange={handleChange}
                placeholder="Samsung Galaxy S24"
              />
            </label>

            <label>
              Alert email
              <input
                name="email"
                type="email"
                value={form.email}
                onChange={handleChange}
                placeholder="you@example.com"
                required
              />
            </label>

            <label>
              Amazon URL
              <input
                name="amazonUrl"
                value={form.amazonUrl}
                onChange={handleChange}
                placeholder="https://www.amazon.in/..."
              />
            </label>

            <label>
              Flipkart URL
              <input
                name="flipkartUrl"
                value={form.flipkartUrl}
                onChange={handleChange}
                placeholder="https://www.flipkart.com/..."
              />
            </label>

            <label>
              Target price
              <input
                name="targetPrice"
                type="number"
                min="0"
                value={form.targetPrice}
                onChange={handleChange}
                placeholder="50000"
              />
            </label>

            <button className="primary-action" disabled={saving}>
              {saving ? "Saving..." : "Track price"}
            </button>
          </form>

          <section className="product-panel">
            <div className="section-title">
              <h2>Tracked products</h2>
              <button className="ghost-button" onClick={loadProducts}>
                Refresh list
              </button>
            </div>

            {loading ? (
              <div className="empty-state">Loading products...</div>
            ) : products.length ? (
              <div className="product-list">
                {products.map((product) => (
                  <article
                    className={
                      product._id === selectedProductId
                        ? "product-card active"
                        : "product-card"
                    }
                    key={product._id}
                  >
                    <button
                      className="product-main"
                      onClick={() => setSelectedProductId(product._id)}
                    >
                      <span className="product-name">{product.title}</span>
                      <span className="product-meta">
                        Best: {product.bestPlatform || "pending"} ·{" "}
                        {formatDate(product.lastCheckedAt)}
                      </span>
                    </button>

                    <div className="price-grid">
                      <div>
                        <span>Amazon</span>
                        <strong>{formatPrice(product.amazonPrice)}</strong>
                      </div>
                      <div>
                        <span>Flipkart</span>
                        <strong>{formatPrice(product.flipkartPrice)}</strong>
                      </div>
                      <div>
                        <span>Lowest</span>
                        <strong>{formatPrice(product.lowestPrice)}</strong>
                      </div>
                    </div>

                    <div className="card-actions">
                      <label className="toggle">
                        <input
                          type="checkbox"
                          checked={product.alertEnabled}
                          onChange={() => handleToggleAlert(product)}
                        />
                        <span>Email</span>
                      </label>
                      <button
                        className="ghost-button"
                        disabled={refreshingId === product._id}
                        onClick={() => handleRefresh(product._id)}
                      >
                        {refreshingId === product._id ? "Checking..." : "Check"}
                      </button>
                      <button
                        className="danger-button"
                        onClick={() => handleDelete(product._id)}
                      >
                        Delete
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className="empty-state">No products tracked yet.</div>
            )}
          </section>

          <aside className="history-panel">
            <div className="section-title">
              <h2>Price history</h2>
              <span>{selectedProduct?.bestPlatform || "No deal"}</span>
            </div>

            {selectedProduct && (
              <div className="selected-summary">
                <strong>{selectedProduct.title}</strong>
                <span>{formatPrice(selectedProduct.lowestPrice)}</span>
              </div>
            )}

            {history.length ? (
              <div className="history-list">
                {history
                  .slice()
                  .reverse()
                  .slice(0, 12)
                  .map((entry, index) => (
                    <div className="history-row" key={`${entry.checkedAt}-${index}`}>
                      <span>{entry.platform}</span>
                      <strong>{formatPrice(entry.price)}</strong>
                      <time>{formatDate(entry.checkedAt)}</time>
                    </div>
                  ))}
              </div>
            ) : (
              <div className="empty-state">Select or refresh a product.</div>
            )}
          </aside>
        </section>
      </section>
    </main>
  );
}

export default App;
