import { useCallback, useEffect, useMemo, useState } from "react";
import { getInitialLanguage, localizeTree, translateCategory } from "./i18n.js";

const money = (value) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(Number(value || 0));
const fallbackImage = "https://images.unsplash.com/photo-1490312278390-ab64016e0aa9?auto=format&fit=crop&w=900&q=85";

async function request(path, options = {}, token) {
  const response = await fetch(`/api${path}`, {
    ...options,
    headers: {
      ...(options.body && !(options.body instanceof FormData) ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });
  const contentType = response.headers.get("content-type") || "";
  const data = contentType.includes("application/json") ? await response.json() : null;
  if (!response.ok) {
    throw new Error(data?.error || `The API request failed (HTTP ${response.status}). Check the backend server and database.`);
  }
  return data;
}

function App() {
  const [products, setProducts] = useState([]);
  const [productsError, setProductsError] = useState("");
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All");
  const [page, setPage] = useState("Home");
  const [cart, setCart] = useState(() => JSON.parse(localStorage.getItem("danu-cart") || "[]"));
  const [token, setToken] = useState(() => localStorage.getItem("danu-token"));
  const [user, setUser] = useState(() => JSON.parse(localStorage.getItem("danu-user") || "null"));
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [authMode, setAuthMode] = useState("login");
  const [authRole, setAuthRole] = useState("customer");
  const [authOpen, setAuthOpen] = useState(false);
  const [orders, setOrders] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [adminTab, setAdminTab] = useState("orders");
  const [editingProduct, setEditingProduct] = useState(null);
  const [orderDetails, setOrderDetails] = useState({});
  const [language, setLanguage] = useState(getInitialLanguage);

  const loadProducts = useCallback(async () => {
    try {
      const data = await request(`/products${query ? `?search=${encodeURIComponent(query)}` : ""}`);
      setProducts(data);
      setProductsError("");
    } catch (error) {
      setProductsError(error.message);
      setNotice(error.message);
    }
  }, [query]);

  const loadOrders = useCallback(async () => {
    if (!token) return;
    try {
      const data = await request("/orders", {}, token);
      setOrders(data);
    } catch (error) {
      setNotice(error.message);
    }
  }, [token]);

  useEffect(() => { loadProducts(); }, [loadProducts]);
  useEffect(() => { localStorage.setItem("danu-cart", JSON.stringify(cart)); }, [cart]);
  useEffect(() => { loadOrders(); }, [loadOrders]);
  useEffect(() => {
    if (user?.role === "admin" && token) {
      request("/admin/customers", {}, token).then(setCustomers).catch((error) => setNotice(error.message));
    }
  }, [token, user]);
  useEffect(() => {
    if (!notice) return undefined;
    const timer = setTimeout(() => setNotice(""), 3800);
    return () => clearTimeout(timer);
  }, [notice]);
  useEffect(() => {
    localStorage.setItem("danu-language", language);
    document.documentElement.lang = language;
    document.title = language === "ti" ? "ዳኑ ኢ-ሾፕ — ብጥንቃቐ ዝተመርጸ" : "Danu E-shop — Thoughtfully chosen";
    document.querySelector('meta[name="description"]')?.setAttribute(
      "content",
      language === "ti"
        ? "ንመዓልታዊ ህይወት ብጥንቃቐ ዝተመርጹ ኣቕሑ ኣብ ዳኑ ኢ-ሾፕ ዕደግ።"
        : "Shop considered essentials for the everyday at Danu E-shop.",
    );
  }, [language]);

  const categories = useMemo(() => ["All", ...new Set(products.map((product) => product.category).filter(Boolean))], [products]);
  const shownProducts = products.filter((product) => category === "All" || product.category === category);
  const cartCount = cart.reduce((total, item) => total + item.quantity, 0);
  const cartTotal = cart.reduce((total, item) => total + Number(item.price) * item.quantity, 0);

  function addToCart(product) {
    setCart((current) => {
      const found = current.find((item) => item.id === product.id);
      if (found) return current.map((item) => item.id === product.id ? { ...item, quantity: Math.min(item.quantity + 1, product.stock) } : item);
      return [...current, { ...product, quantity: 1 }];
    });
    setNotice(`${product.name} added to your bag`);
  }

  function updateQuantity(id, quantity) {
    if (quantity < 1) {
      setCart((current) => current.filter((item) => item.id !== id));
      return;
    }
    setCart((current) => current.map((item) => item.id === id ? { ...item, quantity: Math.min(quantity, item.stock) } : item));
  }

  async function submitAuth(event) {
    event.preventDefault();
    if (authRole === "admin" && authMode === "register") {
      setAuthMode("login");
      setNotice("Admin accounts are configured by the store owner.");
      return;
    }
    setBusy(true);
    const form = new FormData(event.currentTarget);
    const body = Object.fromEntries(form.entries());
    try {
      const data = await request(`/auth/${authMode}`, {
        method: "POST",
        body: JSON.stringify({ ...body, role: authRole }),
      });
      if (data.user.role !== authRole) throw new Error("This account does not have the selected access level.");
      localStorage.setItem("danu-token", data.token);
      localStorage.setItem("danu-user", JSON.stringify(data.user));
      setToken(data.token);
      setUser(data.user);
      setAuthOpen(false);
      setPage(data.user.role === "admin" ? "Admin" : "Account");
      setNotice(`Welcome${data.user.name ? `, ${data.user.name}` : ""}!`);
    } catch (error) {
      setNotice(error.message);
    } finally {
      setBusy(false);
    }
  }

  function signOut() {
    localStorage.removeItem("danu-token");
    localStorage.removeItem("danu-user");
    setToken(null);
    setUser(null);
    setOrders([]);
    setPage("Home");
    setNotice("You have been signed out");
  }

  async function checkout(event) {
    event.preventDefault();
    if (!token) {
      setAuthOpen(true);
      setNotice("Sign in to complete your order");
      return;
    }
    if (user.role !== "customer") {
      setNotice("Customer sign-in is required to place an order");
      return;
    }
    const address = new FormData(event.currentTarget).get("address");
    setBusy(true);
    try {
      const created = await request("/orders", {
        method: "POST",
        body: JSON.stringify({
          items: cart.map(({ id, quantity }) => ({ productId: id, quantity })),
          shippingAddress: address,
          paymentMethod: "demo",
        }),
      }, token);
      setCart([]);
      setPage("Account");
      await loadOrders();
      setNotice(`Order #${created.id} placed — demo checkout only; no payment was taken.`);
    } catch (error) {
      setNotice(error.message);
    } finally {
      setBusy(false);
    }
  }

  async function saveProfile(event) {
    event.preventDefault();
    const body = Object.fromEntries(new FormData(event.currentTarget).entries());
    try {
      const data = await request("/me", { method: "PUT", body: JSON.stringify(body) }, token);
      setUser(data);
      localStorage.setItem("danu-user", JSON.stringify(data));
      setNotice("Profile updated");
    } catch (error) {
      setNotice(error.message);
    }
  }

  async function subscribe(event) {
    event.preventDefault();
    const email = new FormData(event.currentTarget).get("email");
    try {
      await request("/subscriptions", { method: "POST", body: JSON.stringify({ email }) });
      event.currentTarget.reset();
      setNotice("You're on the list — look out for a note from us.");
    } catch (error) {
      setNotice(error.message);
    }
  }

  async function saveProduct(event) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const imageFile = formData.get("image_file");
    const body = Object.fromEntries([...formData.entries()].filter(([key]) => key !== "image_file"));
    setBusy(true);
    const isEditing = Boolean(editingProduct?.id);
    const path = isEditing ? `/admin/products/${editingProduct.id}` : "/admin/products";
    try {
      if (imageFile instanceof File && imageFile.size > 0) {
        const upload = new FormData();
        upload.append("image", imageFile);
        const uploadedImage = await request("/admin/uploads", { method: "POST", body: upload }, token);
        body.image_url = uploadedImage.image_url;
      }
      body.price = Number(body.price);
      body.stock = Number(body.stock);
      await request(path, { method: isEditing ? "PUT" : "POST", body: JSON.stringify(body) }, token);
      setEditingProduct(null);
      setQuery("");
      setCategory("All");
      setProducts(await request("/products"));
      setProductsError("");
      setNotice("Product saved and added to the storefront");
    } catch (error) {
      setNotice(error.message);
    } finally {
      setBusy(false);
    }
  }

  async function deleteProduct(id) {
    if (!window.confirm("Delete this product?")) return;
    try {
      await request(`/admin/products/${id}`, { method: "DELETE" }, token);
      await loadProducts();
      setNotice("Product deleted");
    } catch (error) {
      setNotice(error.message);
    }
  }

  async function updateOrder(id, status) {
    try {
      await request(`/admin/orders/${id}`, { method: "PATCH", body: JSON.stringify({ status }) }, token);
      await loadOrders();
      setNotice(`Order #${id} updated`);
    } catch (error) {
      setNotice(error.message);
    }
  }

  async function downloadInvoice(orderId) {
    try {
      const response = await fetch(`/api/orders/${orderId}/invoice`, { headers: { Authorization: `Bearer ${token}` } });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Unable to download invoice");
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `danu-invoice-${orderId}.pdf`;
      anchor.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      setNotice(error.message);
    }
  }

  async function toggleOrder(id) {
    if (orderDetails[id]) {
      setOrderDetails((details) => ({ ...details, [id]: null }));
      return;
    }
    try {
      const detail = await request(`/orders/${id}`, {}, token);
      setOrderDetails((details) => ({ ...details, [id]: detail }));
    } catch (error) {
      setNotice(error.message);
    }
  }

  const nav = ["Home", "Shop all", "About us", "Blog", "All vendors", "Contact"];
  return localizeTree((
    <div className="app-shell" lang={language}>
      <div className="announcement">A little more thoughtful. A little less ordinary. <span>Free shipping over $75</span></div>
      <header className="site-header">
        <button className="wordmark" onClick={() => setPage("Home")} aria-label="Danu E-shop home">danu<span>.</span></button>
        <nav className="desktop-nav" aria-label="Main navigation">
          {nav.map((item) => <button className={page === item ? "nav-link active" : "nav-link"} key={item} onClick={() => setPage(item)}>{item}</button>)}
        </nav>
        <div className="header-actions">
          <label className="search-box">
            <span className="icon">⌕</span>
            <input aria-label="Search products" placeholder="Search..." value={query} onChange={(event) => { setQuery(event.target.value); setPage("Shop all"); }} />
          </label>
          {user ? <button className="header-icon account-trigger" onClick={() => setPage(user.role === "admin" ? "Admin" : "Account")} aria-label="Open account">♙</button> : <button className="header-icon" onClick={() => { setAuthRole("customer"); setAuthMode("login"); setAuthOpen(true); }} aria-label="Sign in">♙</button>}
          <button className="header-icon bag-trigger" onClick={() => setPage("Cart")} aria-label={`Shopping bag, ${cartCount} items`}>♧<span className="bag-count">{cartCount}</span></button>
          {user?.role === "admin" && <button className="admin-shortcut" onClick={() => setPage("Admin")}>Admin</button>}
          <button className="language-toggle" onClick={() => setLanguage((current) => current === "en" ? "ti" : "en")} aria-label={language === "en" ? "Change language to Tigrigna" : "Change language to English"}>{language === "en" ? "ትግርኛ" : "English"}</button>
        </div>
        <div className="mobile-nav">{nav.slice(0, 3).map((item) => <button key={item} onClick={() => setPage(item)}>{item}</button>)}</div>
      </header>

      <main>
        {page === "Home" && <HomePage language={language} products={products} productsError={productsError} onRetryProducts={loadProducts} onShop={() => setPage("Shop all")} onAdd={addToCart} onNavigate={setPage} onSubscribe={subscribe} />}
        {page === "Shop all" && <section className="page-section shop-page">
          <div className="eyebrow">THE DANU EDIT</div><h1>Good things, <em>well made.</em></h1><p className="section-lead">Everyday finds from independent makers and thoughtful brands.</p>
          <div className="filter-row"><span>{shownProducts.length} considered finds</span><div className="filter-pills">{categories.map((item) => <button className={category === item ? "filter-pill selected" : "filter-pill"} key={item} onClick={() => setCategory(item)}>{translateCategory(item, language)}</button>)}</div></div>
          <ProductGrid language={language} products={shownProducts} onAdd={addToCart} error={productsError} onRetry={loadProducts} />
        </section>}
        {page === "Cart" && <section className="page-section"><div className="eyebrow">YOUR BAG</div><h1>Good choices.</h1>
          {!cart.length ? <div className="empty-state"><p>Your bag is taking a little breather.</p><button className="button dark" onClick={() => setPage("Shop all")}>Explore the shop</button></div> :
            <div className="cart-layout"><div className="cart-items">{cart.map((item) => <div className="cart-item" key={item.id}><img src={item.image_url || fallbackImage} alt={item.name} /><div className="cart-item-info"><h3>{item.name}</h3><span>{translateCategory(item.category, language)}</span><b>{money(item.price)}</b><div className="quantity"><button onClick={() => updateQuantity(item.id, item.quantity - 1)} aria-label="Decrease quantity">−</button><span>{item.quantity}</span><button onClick={() => updateQuantity(item.id, item.quantity + 1)} aria-label="Increase quantity">+</button></div></div><button className="remove-button" onClick={() => updateQuantity(item.id, 0)}>Remove</button></div>)}</div>
              <form className="checkout-card" onSubmit={checkout}><h2>Order summary</h2><div className="summary-line"><span>Subtotal</span><span>{money(cartTotal)}</span></div><div className="summary-line"><span>Shipping</span><span>{cartTotal >= 75 ? "Free" : money(6.5)}</span></div><div className="summary-line total"><span>Total</span><b>{money(cartTotal + (cartTotal >= 75 ? 0 : 6.5))}</b></div><label className="field-label">Shipping address<textarea name="address" placeholder="Street, city, postal code" required /></label><label className="demo-payment"><input type="radio" checked readOnly /> Demo checkout <small>No payment will be taken</small></label><button className="button dark full" disabled={busy}>{busy ? "Placing order..." : "Place order"}</button><p className="fine-print">Secure demo checkout. Payment processing is not connected.</p></form></div>}
        </section>}
        {page === "Account" && <section className="page-section"><div className="eyebrow">YOUR DANU</div><div className="account-heading"><div><h1>Hello, {user?.name?.split(" ")[0] || "there"}.</h1><p className="section-lead">Your details and all the good things on their way.</p></div><button className="text-button" onClick={signOut}>Sign out ↗</button></div>
          <div className="account-layout"><form className="profile-card" onSubmit={saveProfile}><h2>Your details</h2><label className="field-label">Name<input name="name" defaultValue={user?.name} required /></label><label className="field-label">Email<input value={user?.email || ""} readOnly /></label><label className="field-label">Phone<input name="phone" defaultValue={user?.phone || ""} /></label><label className="field-label">Address<textarea name="address" defaultValue={user?.address || ""} /></label><button className="button dark">Save details</button></form>
            <div className="orders-panel"><div className="panel-title"><h2>Your orders</h2><span>{orders.length} total</span></div>{orders.length ? orders.map((order) => <OrderCard key={order.id} language={language} order={order} detail={orderDetails[order.id]} onToggle={toggleOrder} onInvoice={downloadInvoice} />) : <p className="muted">Your first order will look right at home here.</p>}</div></div>
        </section>}
        {page === "Admin" && user?.role === "admin" && <section className="page-section admin-page"><div className="admin-title-row"><div><div className="eyebrow">DANU CONTROL ROOM</div><h1>Good morning, <em>admin.</em></h1></div><button className="text-button" onClick={signOut}>Sign out ↗</button></div>
          <div className="admin-tabs">{[["orders", "Orders"], ["products", "Products"], ["customers", "Customers"]].map(([key, label]) => <button key={key} className={adminTab === key ? "admin-tab active" : "admin-tab"} onClick={() => setAdminTab(key)}>{label}</button>)}</div>
          {adminTab === "orders" && <div className="admin-table"><div className="table-heading"><span>Order</span><span>Customer</span><span>Date</span><span>Total</span><span>Status</span><span>Manage</span></div>{orders.map((order) => <div className="table-row" key={order.id}><b>#{order.id}</b><span>{order.customer_name}<small>{order.customer_email}</small></span><span>{new Date(order.created_at).toLocaleDateString()}</span><b>{money(order.total)}</b><span className={`status status-${order.status}`}>{order.status}</span><select value={order.status} onChange={(event) => updateOrder(order.id, event.target.value)} aria-label={`Update order ${order.id} status`}>{["pending", "processing", "shipped", "delivered", "cancelled"].map((status) => <option key={status}>{status}</option>)}</select></div>)}{!orders.length && <p className="muted table-empty">No orders yet.</p>}</div>}
          {adminTab === "products" && <div className="admin-products"><div className="admin-list-heading"><h2>Product catalogue</h2><button className="button dark small-button" onClick={() => setEditingProduct({})}>＋ Add product</button></div>{editingProduct && <form className="product-form" onSubmit={saveProduct}><h3>{editingProduct.id ? "Edit product" : "New product"}</h3><div className="form-grid"><label className="field-label">Name<input name="name" defaultValue={editingProduct.name} required /></label><label className="field-label">Category<input name="category" defaultValue={editingProduct.category} required /></label><label className="field-label">Price<input name="price" type="number" min="0" step="0.01" defaultValue={editingProduct.price} required /></label><label className="field-label">Stock<input name="stock" type="number" min="0" defaultValue={editingProduct.stock ?? 1} required /></label><label className="field-label">Vendor<input name="vendor" defaultValue={editingProduct.vendor} /></label><label className="field-label">Image URL<input name="image_url" type="url" defaultValue={editingProduct.image_url} placeholder="https://example.com/image.jpg" /></label><label className="field-label">Or upload image<input name="image_file" type="file" accept="image/jpeg,image/png,image/webp,image/gif" /><small className="upload-hint">JPG, PNG, WebP, or GIF · up to 5 MB. An uploaded file takes priority over the URL.</small></label><label className="field-label full-field">Description<textarea name="description" defaultValue={editingProduct.description} /></label></div><div className="form-actions"><button className="button dark" disabled={busy}>{busy ? "Saving product..." : "Save product"}</button><button type="button" className="button light" onClick={() => setEditingProduct(null)}>Cancel</button></div></form>}
              {productsError && <ProductLoadError language={language} error={productsError} onRetry={loadProducts} />}
              <div className="product-admin-list">{products.map((product) => <div className="product-admin-row" key={product.id}><img src={product.image_url || fallbackImage} alt="" /><div><b>{product.name}</b><small>{translateCategory(product.category, language)} · {product.stock} in stock</small></div><b>{money(product.price)}</b><button className="text-button" onClick={() => setEditingProduct(product)}>Edit</button><button className="text-button danger" onClick={() => deleteProduct(product.id)}>Delete</button></div>)}</div></div>}
          {adminTab === "customers" && <div className="customer-grid">{customers.map((customer) => <div className="customer-card" key={customer.id}><span className="customer-avatar">{customer.name?.[0] || "D"}</span><div><b>{customer.name}</b><span>{customer.email}</span><small>{customer.order_count} orders · joined {new Date(customer.created_at).toLocaleDateString()}</small></div></div>)}</div>}
        </section>}
        {["About us", "Blog", "All vendors", "Contact"].includes(page) && <InfoPage language={language} page={page} onSubscribe={subscribe} />}
      </main>
      <footer className="site-footer"><div className="footer-main"><div className="footer-brand"><button className="wordmark" onClick={() => setPage("Home")}>Danu<span>.</span></button><p>Thoughtful things for the everyday.<br />Made by people who care.</p></div><div><h4>Explore</h4>{nav.slice(0, 4).map((item) => <button className="footer-link" key={item} onClick={() => setPage(item)}>{item}</button>)}</div><div><h4>Need a hand?</h4><button className="footer-link" onClick={() => setPage("Contact")}>Contact us</button><button className="footer-link" onClick={() => setPage("Account")}>Track an order</button><span className="footer-link">hello@danu.shop</span></div><form className="newsletter" onSubmit={subscribe}><h4>A good note, now and then.</h4><p>New makers, small joys, and a little 10% off.</p><div className="newsletter-input"><input name="email" type="email" placeholder="Your email address" required /><button aria-label="Subscribe">→</button></div></form></div><div className="footer-bottom"><span>© 2026 Danu E-shop</span><span>Independent finds. Considered living.</span><button onClick={() => { setAuthRole("admin"); setAuthMode("login"); setAuthOpen(true); }}>Admin access</button></div></footer>
      {authOpen && <div className="modal-backdrop" onClick={() => setAuthOpen(false)}><div className="auth-modal" onClick={(event) => event.stopPropagation()}><button className="modal-close" onClick={() => setAuthOpen(false)} aria-label="Close">×</button><div className="eyebrow">{authRole === "admin" ? "STAFF ACCESS" : "WELCOME TO DANU"}</div><h2>{authMode === "login" ? "A familiar face." : "Let's get acquainted."}</h2><div className="role-switch"><button className={authRole === "customer" ? "selected" : ""} onClick={() => setAuthRole("customer")}>Customer</button><button className={authRole === "admin" ? "selected" : ""} onClick={() => setAuthRole("admin")}>Admin</button></div><form className="auth-form" onSubmit={submitAuth}>{authMode === "register" && <label className="field-label">Full name<input name="name" required /></label>}<label className="field-label">Email<input type="email" name="email" required autoComplete="email" /></label><label className="field-label">Password<input type="password" name="password" minLength="8" required autoComplete={authMode === "login" ? "current-password" : "new-password"} /></label><button className="button dark full" disabled={busy}>{busy ? "One moment..." : authMode === "login" ? "Sign in" : "Create account"}</button></form><p className="auth-switch">{authMode === "login" ? "New around here?" : "Already have an account?"} <button onClick={() => setAuthMode(authMode === "login" ? "register" : "login")}>{authMode === "login" ? "Create an account" : "Sign in"}</button></p><p className="fine-print">Admin accounts are configured by the store owner.</p></div></div>}
      {notice && <div className="toast" role="status">{notice}<button onClick={() => setNotice("")}>×</button></div>}
    </div>
  ), language);
}

function HomePage({ language, products, productsError, onRetryProducts, onShop, onAdd, onNavigate, onSubscribe }) {
  return localizeTree((<>
    <section className="hero"><div className="hero-copy"><div className="eyebrow">A MORE CONSIDERED EVERYDAY</div><h1>Find your new<br />favorite <em>thing.</em></h1><p>Good design. Honest materials. Makers with a story to tell. Find the things that make every day feel a little more like yours.</p><button className="button dark" onClick={onShop}>Shop the collection <span>↗</span></button><div className="hero-note"><span className="tiny-sun">✳</span> Small batch, big heart</div></div><div className="hero-art"><img src="https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=1500&q=90" alt="Warm, thoughtfully designed living space" /><div className="hero-sticker">Thoughtful<br />by nature <span>✳</span></div><div className="hero-caption">THE SLOW LIVING EDIT — NO. 04</div></div><div className="hero-side-text">INDEPENDENT FINDS · CONSIDERED LIVING</div></section>
    <section className="promise-strip"><span>✳ Considered materials</span><span>✳ Made by real people</span><span>✳ A little less ordinary</span><span>✳ Good things, made to last</span></section>
    <section className="featured-section"><div className="section-heading"><div><div className="eyebrow">A FEW GOOD THINGS</div><h2>Good finds, <em>right now.</em></h2></div><button className="text-button" onClick={onShop}>Shop everything ↗</button></div><ProductGrid language={language} products={products.slice(0, 4)} onAdd={onAdd} error={productsError} onRetry={onRetryProducts} /></section>
    <section className="story-banner"><div className="story-image"><img src="https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=1100&q=85" alt="Curated independent shop" /></div><div className="story-copy"><div className="eyebrow">A NOTE FROM DANU</div><h2>More meaning.<br /><em>Less noise.</em></h2><p>We believe the things you bring into your home should have a story worth knowing. That's why we make room for the independent, the intentional, and the beautifully made.</p><button className="button outline" onClick={() => onNavigate("About us")}>A little about us <span>↗</span></button></div></section>
    <section className="newsletter-band"><div><div className="eyebrow">THE OCCASIONAL GOOD THING</div><h2>A good note, <em>now and then.</em></h2><p>New makers, small joys, and 10% off your first order.</p></div><form onSubmit={onSubscribe}><input name="email" type="email" placeholder="Your email address" required /><button>Count me in ↗</button></form></section>
  </>), language);
}

function ProductGrid({ language, products, onAdd, error, onRetry }) {
  if (error) return <ProductLoadError language={language} error={error} onRetry={onRetry} />;
  if (!products.length) return localizeTree(<div className="empty-products">Nothing found just yet. Try another search, or check back soon.</div>, language);
  return localizeTree(<div className="product-grid">{products.map((product, index) => <article className="product-card" key={product.id}><div className="product-image-wrap"><img src={product.image_url || fallbackImage} alt={product.name} loading="lazy" /><span className="product-tag">{index === 0 ? "A DANU FAVORITE" : translateCategory(product.category || "", language)}</span><button className="quick-add" onClick={() => onAdd(product)} disabled={product.stock < 1}>{product.stock < 1 ? "Sold out" : "＋ Add to bag"}</button></div><div className="product-meta"><div><h3>{product.name}</h3><span>{product.vendor || "Danu edit"}</span></div><b>{money(product.price)}</b></div></article>)}</div>, language);
}

function ProductLoadError({ language, error, onRetry }) {
  return localizeTree(<div className="product-load-error" role="alert">
    <p>We couldn’t load products. {error}</p>
    <button className="button light" onClick={onRetry}>Try again</button>
  </div>, language);
}

function OrderCard({ language, order, detail, onToggle, onInvoice }) {
  return localizeTree(<div className="order-card"><div className="order-card-main"><div><span className="order-number">ORDER #{order.id}</span><span className="order-date">{new Date(order.created_at).toLocaleDateString(language === "ti" ? "ti-ER" : "en-US")}</span></div><span className={`status status-${order.status}`}>{order.status}</span><b>{money(order.total)}</b><button className="text-button" onClick={() => onToggle(order.id)}>{detail ? "Hide details" : "View details"}</button><button className="invoice-button" onClick={() => onInvoice(order.id)}>↓ Invoice</button></div>{detail && <div className="order-detail"><p><b>Tracking:</b> {order.status === "shipped" || order.status === "delivered" ? `DANU-${String(order.id).padStart(6, "0")}` : "Tracking will appear when your order ships."}</p>{detail.items.map((item) => <div key={item.id}>{item.product_name} × {item.quantity} <span>{money(item.unit_price * item.quantity)}</span></div>)}</div>}</div>, language);
}

function InfoPage({ language, page, onSubscribe }) {
  const content = {
    "About us": ["A softer kind of shopping.", "Danu is a home for thoughtful objects, independent makers, and the everyday things that make life feel a little more considered. We believe good design should be kind to the people who make it and the places we live."],
    "Blog": ["The Danu journal.", "Notes from our makers, little rituals for slower days, and ideas for making a home your own. Our journal is just getting started — join our list and be the first to read along."],
    "All vendors": ["People behind the good things.", "Every Danu find comes from a maker or small brand that cares about doing things well. We’re growing our collective of independent makers — check back for stories from the people behind the products."],
    "Contact": ["We’re all ears.", "Questions about an order, a product, or just want to say hello? Drop us a note at hello@danu.shop. We’re a small team and we’ll get back to you within two working days."],
  }[page];
  return localizeTree(<section className="info-page"><div className="eyebrow">A LITTLE ABOUT DANU</div><h1>{content[0]}</h1><p>{content[1]}</p><button className="button dark" onClick={() => window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" })}>Stay in touch ↗</button><div className="info-decoration">d<span>.</span></div><div className="info-photo"><img src="https://images.unsplash.com/photo-1490312278390-ab64016e0aa9?auto=format&fit=crop&w=1200&q=85" alt="Thoughtfully arranged home objects" /></div><div className="info-newsletter"><h2>Good things are better <em>shared.</em></h2><form onSubmit={onSubscribe}><input name="email" type="email" placeholder="Your email address" required /><button>Join the list ↗</button></form></div></section>, language);
}

export default App;
