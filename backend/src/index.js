import dotenv from "dotenv";
import express from "express";
import cors from "cors";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import multer from "multer";
import PDFDocument from "pdfkit";
import pg from "pg";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { randomUUID } from "node:crypto";

dotenv.config({ path: resolve(dirname(fileURLToPath(import.meta.url)), "../../.env") });

const { Pool } = pg;
const app = express();
const port = Number(process.env.PORT || 4000);
const serverDirectory = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const uploadDirectory = resolve(serverDirectory, "uploads");
const jwtSecret = process.env.JWT_SECRET;
if (!jwtSecret) throw new Error("JWT_SECRET must be set in the environment.");
if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL must be set in the environment.");

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: Number(process.env.PG_POOL_MAX || 10),
});
app.use(cors({ origin: process.env.CLIENT_ORIGIN || "http://localhost:5173" }));
app.use(express.json({ limit: "1mb" }));
app.use("/api/uploads", express.static(uploadDirectory, {
  dotfiles: "deny",
  index: false,
  setHeaders(response) {
    response.setHeader("X-Content-Type-Options", "nosniff");
    response.setHeader("Cache-Control", "public, max-age=31536000, immutable");
  },
}));

const imageTypes = new Map([
  ["image/jpeg", { extension: "jpg", signature: (buffer) => buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff }],
  ["image/png", { extension: "png", signature: (buffer) => buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) }],
  ["image/webp", { extension: "webp", signature: (buffer) => buffer.toString("ascii", 0, 4) === "RIFF" && buffer.toString("ascii", 8, 12) === "WEBP" }],
  ["image/gif", { extension: "gif", signature: (buffer) => ["GIF87a", "GIF89a"].includes(buffer.toString("ascii", 0, 6)) }],
]);

const imageUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
  fileFilter(_req, file, callback) {
    if (!imageTypes.has(file.mimetype)) {
      callback(Object.assign(new Error("Choose a JPG, PNG, WebP, or GIF image."), { status: 400 }));
      return;
    }
    callback(null, true);
  },
});

async function initializeDatabase() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'customer' CHECK (role IN ('customer', 'admin')),
      phone TEXT NOT NULL DEFAULT '',
      address TEXT NOT NULL DEFAULT '',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS products (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      price NUMERIC(10, 2) NOT NULL CHECK (price >= 0),
      category TEXT NOT NULL,
      vendor TEXT NOT NULL DEFAULT '',
      image_url TEXT NOT NULL DEFAULT '',
      stock INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS orders (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id),
      total NUMERIC(10, 2) NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'shipped', 'delivered', 'cancelled')),
      payment_method TEXT NOT NULL DEFAULT 'demo',
      shipping_address TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS order_items (
      id SERIAL PRIMARY KEY,
      order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
      product_id INTEGER REFERENCES products(id) ON DELETE SET NULL,
      product_name TEXT NOT NULL,
      quantity INTEGER NOT NULL CHECK (quantity > 0),
      unit_price NUMERIC(10, 2) NOT NULL
    );
    CREATE TABLE IF NOT EXISTS subscriptions (
      id SERIAL PRIMARY KEY,
      email TEXT NOT NULL UNIQUE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS orders_user_id_idx ON orders(user_id);
    CREATE INDEX IF NOT EXISTS order_items_order_id_idx ON order_items(order_id);
  `);

  const { rows } = await pool.query("SELECT COUNT(*)::int AS count FROM products");
  if (rows[0].count === 0) {
    const seed = [
      ["Stoneware Table Vase", "Hand-thrown stoneware with a soft matte glaze.", 42, "Home", "Field & Form", "https://images.unsplash.com/photo-1578749556568-bc2c40e68b61?auto=format&fit=crop&w=900&q=85", 18],
      ["Everyday Linen Throw", "Washed European linen, woven for a softer everyday.", 88, "Textiles", "Sunday Studio", "https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=900&q=85", 12],
      ["Slow Morning Candle", "A clean-burning soy candle with cedar and bergamot.", 34, "Living", "Good Hours", "https://images.unsplash.com/photo-1603006905003-be475563bc59?auto=format&fit=crop&w=900&q=85", 24],
      ["Handwoven Market Tote", "A sturdy, naturally dyed cotton carry-all.", 56, "Accessories", "Common Ground", "https://images.unsplash.com/photo-1590874103328-eac38a683ce7?auto=format&fit=crop&w=900&q=85", 15],
      ["Ribbed Ceramic Cup", "A tactile little cup made for long coffee breaks.", 28, "Home", "Field & Form", "https://images.unsplash.com/photo-1514228742587-6b1558fcca3d?auto=format&fit=crop&w=900&q=85", 30],
      ["Quiet Hours Journal", "Recycled paper pages for lists, thoughts, and plans.", 22, "Stationery", "Paper People", "https://images.unsplash.com/photo-1531346878377-a5be20888e57?auto=format&fit=crop&w=900&q=85", 42],
      ["Woven Wall Basket", "A sculptural storage basket woven by hand.", 64, "Home", "Common Ground", "https://images.unsplash.com/photo-1490312278390-ab64016e0aa9?auto=format&fit=crop&w=900&q=85", 9],
      ["Botanical Hand Wash", "Gentle, refillable hand wash with a fresh herbal scent.", 19, "Body", "Kindred Goods", "https://images.unsplash.com/photo-1608248543803-ba4f8c70ae0b?auto=format&fit=crop&w=900&q=85", 28],
    ];
    for (const product of seed) {
      await pool.query(
        "INSERT INTO products (name, description, price, category, vendor, image_url, stock) VALUES ($1, $2, $3, $4, $5, $6, $7)",
        product,
      );
    }
  }

  if (process.env.ADMIN_EMAIL && process.env.ADMIN_PASSWORD) {
    const passwordHash = await bcrypt.hash(process.env.ADMIN_PASSWORD, 12);
    await pool.query(
      `INSERT INTO users (name, email, password_hash, role)
       VALUES ('Danu Admin', LOWER($1), $2, 'admin')
       ON CONFLICT (email) DO UPDATE SET role = 'admin', password_hash = EXCLUDED.password_hash`,
      [process.env.ADMIN_EMAIL, passwordHash],
    );
  }
}

function createToken(user) {
  return jwt.sign({ id: user.id, role: user.role }, jwtSecret, { expiresIn: "7d" });
}

function authenticate(req, res, next) {
  const [scheme, token] = (req.headers.authorization || "").split(" ");
  if (scheme !== "Bearer" || !token) return res.status(401).json({ error: "Please sign in to continue." });
  try {
    req.auth = jwt.verify(token, jwtSecret);
    return next();
  } catch {
    return res.status(401).json({ error: "Your session has expired. Please sign in again." });
  }
}

function requireAdmin(req, res, next) {
  if (req.auth.role !== "admin") return res.status(403).json({ error: "Admin access required." });
  return next();
}

function validEmail(value) {
  return typeof value === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

app.get("/api/health", (_req, res) => res.json({ status: "ok" }));

app.get("/api/products", async (req, res, next) => {
  try {
    const search = String(req.query.search || "").trim();
    const { rows } = await pool.query(
      `SELECT id, name, description, price, category, vendor, image_url, stock
       FROM products
       WHERE ($1 = '' OR name ILIKE '%' || $1 || '%' OR description ILIKE '%' || $1 || '%'
         OR category ILIKE '%' || $1 || '%' OR vendor ILIKE '%' || $1 || '%')
       ORDER BY id`,
      [search],
    );
    res.json(rows);
  } catch (error) { next(error); }
});

app.post("/api/auth/register", async (req, res, next) => {
  const { name, email, password } = req.body || {};
  if (typeof name !== "string" || name.trim().length < 2 || !validEmail(email) || typeof password !== "string" || password.length < 8) {
    return res.status(400).json({ error: "Enter your name, a valid email, and a password of at least 8 characters." });
  }
  try {
    const passwordHash = await bcrypt.hash(password, 12);
    const { rows } = await pool.query(
      `INSERT INTO users (name, email, password_hash)
       VALUES ($1, LOWER($2), $3)
       RETURNING id, name, email, role, phone, address`,
      [name.trim(), email, passwordHash],
    );
    return res.status(201).json({ token: createToken(rows[0]), user: rows[0] });
  } catch (error) {
    if (error.code === "23505") return res.status(409).json({ error: "An account with that email already exists." });
    return next(error);
  }
});

app.post("/api/auth/login", async (req, res, next) => {
  const { email, password } = req.body || {};
  if (!validEmail(email) || typeof password !== "string") return res.status(400).json({ error: "Enter your email and password." });
  try {
    const { rows } = await pool.query("SELECT * FROM users WHERE email = LOWER($1)", [email]);
    if (!rows[0] || !(await bcrypt.compare(password, rows[0].password_hash))) {
      return res.status(401).json({ error: "Email or password is incorrect." });
    }
    const { password_hash: _passwordHash, ...user } = rows[0];
    return res.json({ token: createToken(user), user });
  } catch (error) { return next(error); }
});

app.get("/api/me", authenticate, async (req, res, next) => {
  try {
    const { rows } = await pool.query("SELECT id, name, email, role, phone, address FROM users WHERE id = $1", [req.auth.id]);
    if (!rows[0]) return res.status(404).json({ error: "Account not found." });
    return res.json(rows[0]);
  } catch (error) { return next(error); }
});

app.put("/api/me", authenticate, async (req, res, next) => {
  const { name, phone = "", address = "" } = req.body || {};
  if (typeof name !== "string" || name.trim().length < 2 || typeof phone !== "string" || typeof address !== "string") {
    return res.status(400).json({ error: "Enter a valid name, phone number, and address." });
  }
  try {
    const { rows } = await pool.query(
      "UPDATE users SET name = $1, phone = $2, address = $3 WHERE id = $4 RETURNING id, name, email, role, phone, address",
      [name.trim(), phone.trim(), address.trim(), req.auth.id],
    );
    if (!rows[0]) return res.status(404).json({ error: "Account not found." });
    return res.json(rows[0]);
  } catch (error) { return next(error); }
});

app.post("/api/orders", authenticate, async (req, res, next) => {
  if (req.auth.role !== "customer") return res.status(403).json({ error: "Customer sign-in is required to place an order." });
  const { items, shippingAddress } = req.body || {};
  if (!Array.isArray(items) || items.length === 0 || items.length > 50 || typeof shippingAddress !== "string" || shippingAddress.trim().length < 5) {
    return res.status(400).json({ error: "Add items and a valid shipping address before checking out." });
  }
  const normalized = new Map();
  for (const item of items) {
    const productId = Number(item.productId);
    const quantity = Number(item.quantity);
    if (!Number.isInteger(productId) || productId < 1 || !Number.isInteger(quantity) || quantity < 1 || quantity > 99) {
      return res.status(400).json({ error: "One or more cart quantities are invalid." });
    }
    normalized.set(productId, (normalized.get(productId) || 0) + quantity);
  }
  let client;
  let transactionStarted = false;
  try {
    client = await pool.connect();
    await client.query("BEGIN");
    transactionStarted = true;
    const lineItems = [];
    for (const [productId, quantity] of normalized) {
      const { rows } = await client.query("SELECT id, name, price, stock FROM products WHERE id = $1 FOR UPDATE", [productId]);
      if (!rows[0]) throw Object.assign(new Error("A product in your cart is no longer available."), { status: 400 });
      if (rows[0].stock < quantity) throw Object.assign(new Error(`${rows[0].name} does not have enough stock.`), { status: 409 });
      lineItems.push({ ...rows[0], quantity });
    }
    const total = lineItems.reduce((sum, item) => sum + Number(item.price) * item.quantity, 0) + (lineItems.reduce((sum, item) => sum + Number(item.price) * item.quantity, 0) >= 75 ? 0 : 6.5);
    const { rows: orderRows } = await client.query(
      "INSERT INTO orders (user_id, total, payment_method, shipping_address) VALUES ($1, $2, 'demo', $3) RETURNING id, total, status, created_at",
      [req.auth.id, total.toFixed(2), shippingAddress.trim()],
    );
    const order = orderRows[0];
    for (const item of lineItems) {
      await client.query(
        "INSERT INTO order_items (order_id, product_id, product_name, quantity, unit_price) VALUES ($1, $2, $3, $4, $5)",
        [order.id, item.id, item.name, item.quantity, item.price],
      );
      await client.query("UPDATE products SET stock = stock - $1 WHERE id = $2", [item.quantity, item.id]);
    }
    await client.query("COMMIT");
    transactionStarted = false;
    return res.status(201).json(order);
  } catch (error) {
    if (client && transactionStarted) await client.query("ROLLBACK");
    if (error.status) return res.status(error.status).json({ error: error.message });
    return next(error);
  } finally { client?.release(); }
});

app.get("/api/orders", authenticate, async (req, res, next) => {
  try {
    const isAdmin = req.auth.role === "admin";
    const { rows } = await pool.query(
      `SELECT o.id, o.user_id, o.total, o.status, o.payment_method, o.shipping_address, o.created_at,
              u.name AS customer_name, u.email AS customer_email
       FROM orders o JOIN users u ON u.id = o.user_id
       WHERE ($1::boolean = TRUE OR o.user_id = $2)
       ORDER BY o.created_at DESC`,
      [isAdmin, req.auth.id],
    );
    return res.json(rows);
  } catch (error) { return next(error); }
});

app.get("/api/orders/:id", authenticate, async (req, res, next) => {
  try {
    const { rows: orderRows } = await pool.query(
      `SELECT o.id, o.user_id, o.total, o.status, o.payment_method, o.shipping_address, o.created_at,
              u.name AS customer_name, u.email AS customer_email
       FROM orders o JOIN users u ON u.id = o.user_id WHERE o.id = $1`,
      [req.params.id],
    );
    const order = orderRows[0];
    if (!order) return res.status(404).json({ error: "Order not found." });
    if (req.auth.role !== "admin" && order.user_id !== req.auth.id) return res.status(403).json({ error: "You cannot view this order." });
    const { rows: items } = await pool.query("SELECT id, product_name, quantity, unit_price FROM order_items WHERE order_id = $1", [order.id]);
    return res.json({ ...order, items });
  } catch (error) { return next(error); }
});

app.get("/api/orders/:id/invoice", authenticate, async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT o.id, o.user_id, o.total, o.status, o.shipping_address, o.created_at,
              u.name AS customer_name, u.email AS customer_email
       FROM orders o JOIN users u ON u.id = o.user_id WHERE o.id = $1`,
      [req.params.id],
    );
    const order = rows[0];
    if (!order) return res.status(404).json({ error: "Order not found." });
    if (req.auth.role !== "admin" && order.user_id !== req.auth.id) return res.status(403).json({ error: "You cannot download this invoice." });
    const { rows: items } = await pool.query("SELECT product_name, quantity, unit_price FROM order_items WHERE order_id = $1", [order.id]);
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="danu-invoice-${order.id}.pdf"`);
    const doc = new PDFDocument({ margin: 55 });
    doc.on("error", next);
    doc.pipe(res);
    doc.fontSize(24).font("Helvetica-Bold").fillColor("#35453a").text("danu.", 55, 55);
    doc.fontSize(10).font("Helvetica").fillColor("#77796f").text("INVOICE", 420, 63, { align: "right" });
    doc.moveDown(2);
    doc.fontSize(11).fillColor("#252923").text(`Invoice #${order.id}`);
    doc.text(`Date: ${new Date(order.created_at).toLocaleDateString()}`);
    doc.moveDown();
    doc.font("Helvetica-Bold").text("Bill to");
    doc.font("Helvetica").text(order.customer_name).text(order.customer_email).text(order.shipping_address);
    doc.moveDown(2);
    doc.font("Helvetica-Bold").text("Item", 55, doc.y, { continued: true, width: 250 });
    doc.text("Qty", 330, doc.y - 12, { continued: true, width: 70, align: "right" });
    doc.text("Price", 415, doc.y - 12, { continued: true, width: 125, align: "right" });
    doc.moveDown(0.7).moveTo(55, doc.y).lineTo(540, doc.y).strokeColor("#dedbd2").stroke();
    for (const item of items) {
      doc.moveDown(0.7);
      doc.font("Helvetica").fillColor("#252923").text(item.product_name, 55, doc.y, { continued: true, width: 260 });
      doc.text(String(item.quantity), 330, doc.y - 12, { continued: true, width: 70, align: "right" });
      doc.text(`$${(Number(item.unit_price) * item.quantity).toFixed(2)}`, 415, doc.y - 12, { width: 125, align: "right" });
    }
    doc.moveDown(1.2).moveTo(55, doc.y).lineTo(540, doc.y).stroke();
    doc.moveDown(0.8).font("Helvetica-Bold").fontSize(13).text(`Total  $${Number(order.total).toFixed(2)}`, { align: "right" });
    doc.font("Helvetica").fontSize(9).fillColor("#77796f").text(`Status: ${order.status}`, 55, doc.y + 20);
    doc.end();
    return undefined;
  } catch (error) { return next(error); }
});

app.post("/api/subscriptions", async (req, res, next) => {
  const email = typeof req.body?.email === "string" ? req.body.email.trim().toLowerCase() : "";
  if (!validEmail(email)) return res.status(400).json({ error: "Enter a valid email address." });
  try {
    await pool.query("INSERT INTO subscriptions (email) VALUES ($1) ON CONFLICT (email) DO NOTHING", [email]);
    return res.status(201).json({ message: "Thanks for subscribing." });
  } catch (error) { return next(error); }
});

app.post("/api/admin/uploads", authenticate, requireAdmin, imageUpload.single("image"), async (req, res, next) => {
  if (!req.file) return res.status(400).json({ error: "Choose an image to upload." });
  const imageType = imageTypes.get(req.file.mimetype);
  if (!imageType?.signature(req.file.buffer)) {
    return res.status(400).json({ error: "The selected file is not a valid supported image." });
  }
  const filename = `${randomUUID()}.${imageType.extension}`;
  try {
    await mkdir(uploadDirectory, { recursive: true });
    await writeFile(resolve(uploadDirectory, filename), req.file.buffer, { flag: "wx" });
    return res.status(201).json({ image_url: `/api/uploads/${filename}` });
  } catch (error) { return next(error); }
});

app.post("/api/admin/products", authenticate, requireAdmin, async (req, res, next) => {
  const { name, description = "", price, category, vendor = "", image_url = "", stock = 0 } = req.body || {};
  if (typeof name !== "string" || !name.trim() || typeof category !== "string" || !category.trim() || !Number.isFinite(Number(price)) || Number(price) < 0 || !Number.isInteger(Number(stock)) || Number(stock) < 0) {
    return res.status(400).json({ error: "Enter a product name, category, non-negative price, and whole-number stock." });
  }
  try {
    const { rows } = await pool.query(
      `INSERT INTO products (name, description, price, category, vendor, image_url, stock)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [name.trim(), String(description), Number(price), category.trim(), String(vendor), String(image_url), Number(stock)],
    );
    return res.status(201).json(rows[0]);
  } catch (error) { return next(error); }
});

app.put("/api/admin/products/:id", authenticate, requireAdmin, async (req, res, next) => {
  const { name, description = "", price, category, vendor = "", image_url = "", stock } = req.body || {};
  if (typeof name !== "string" || !name.trim() || typeof category !== "string" || !category.trim() || !Number.isFinite(Number(price)) || Number(price) < 0 || !Number.isInteger(Number(stock)) || Number(stock) < 0) {
    return res.status(400).json({ error: "Enter a product name, category, non-negative price, and whole-number stock." });
  }
  try {
    const { rows } = await pool.query(
      `UPDATE products SET name=$1, description=$2, price=$3, category=$4, vendor=$5, image_url=$6, stock=$7
       WHERE id=$8 RETURNING *`,
      [name.trim(), String(description), Number(price), category.trim(), String(vendor), String(image_url), Number(stock), req.params.id],
    );
    if (!rows[0]) return res.status(404).json({ error: "Product not found." });
    return res.json(rows[0]);
  } catch (error) { return next(error); }
});

app.delete("/api/admin/products/:id", authenticate, requireAdmin, async (req, res, next) => {
  try {
    const result = await pool.query("DELETE FROM products WHERE id = $1", [req.params.id]);
    if (!result.rowCount) return res.status(404).json({ error: "Product not found." });
    return res.status(204).end();
  } catch (error) { return next(error); }
});

app.get("/api/admin/customers", authenticate, requireAdmin, async (_req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT u.id, u.name, u.email, u.created_at, COUNT(o.id)::int AS order_count
       FROM users u LEFT JOIN orders o ON o.user_id = u.id
       WHERE u.role = 'customer' GROUP BY u.id ORDER BY u.created_at DESC`,
    );
    return res.json(rows);
  } catch (error) { return next(error); }
});

app.patch("/api/admin/orders/:id", authenticate, requireAdmin, async (req, res, next) => {
  const allowed = ["pending", "processing", "shipped", "delivered", "cancelled"];
  if (!allowed.includes(req.body?.status)) return res.status(400).json({ error: "Choose a valid order status." });
  let client;
  let transactionStarted = false;
  try {
    client = await pool.connect();
    await client.query("BEGIN");
    transactionStarted = true;
    const { rows: orderRows } = await client.query("SELECT id, status FROM orders WHERE id = $1 FOR UPDATE", [req.params.id]);
    const order = orderRows[0];
    if (!order) {
      await client.query("ROLLBACK");
      transactionStarted = false;
      return res.status(404).json({ error: "Order not found." });
    }
    if (order.status === "cancelled" && req.body.status !== "cancelled") {
      await client.query("ROLLBACK");
      transactionStarted = false;
      return res.status(409).json({ error: "Cancelled orders cannot be reopened. Create a new order instead." });
    }
    if (order.status !== "cancelled" && req.body.status === "cancelled") {
      const { rows: items } = await client.query(
        "SELECT product_id, SUM(quantity)::int AS quantity FROM order_items WHERE order_id = $1 AND product_id IS NOT NULL GROUP BY product_id",
        [order.id],
      );
      for (const item of items) {
        await client.query("UPDATE products SET stock = stock + $1 WHERE id = $2", [item.quantity, item.product_id]);
      }
    }
    const { rows } = await client.query("UPDATE orders SET status = $1 WHERE id = $2 RETURNING id, status", [req.body.status, order.id]);
    await client.query("COMMIT");
    transactionStarted = false;
    return res.json(rows[0]);
  } catch (error) {
    if (client && transactionStarted) await client.query("ROLLBACK");
    return next(error);
  } finally { client?.release(); }
});

app.use((error, _req, res, _next) => {
  if (error instanceof multer.MulterError) {
    const message = error.code === "LIMIT_FILE_SIZE"
      ? "Image files must be 5 MB or smaller."
      : "Choose one supported image file.";
    return res.status(400).json({ error: message });
  }
  if (error.status === 400) return res.status(400).json({ error: error.message });
  console.error(error);
  if (res.headersSent) return;
  return res.status(500).json({ error: "The server could not complete your request." });
});

initializeDatabase()
  .then(() => app.listen(port, () => console.log(`Danu API listening on http://localhost:${port}`)))
  .catch((error) => {
    console.error("Database initialization failed:", error);
    process.exitCode = 1;
  });
