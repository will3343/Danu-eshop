import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { setTimeout as delay } from "node:timers/promises";
import { after, before, test } from "node:test";
import { PGlite } from "@electric-sql/pglite";
import { PGLiteSocketServer } from "@electric-sql/pglite-socket";
import pg from "pg";

const { Pool } = pg;
const backendDirectory = new URL("../", import.meta.url);
const apiPort = await findAvailablePort();
const apiOrigin = `http://127.0.0.1:${apiPort}`;
let database;
let databaseServer;
let backend;
let backendLogs = "";
let databasePort;
let uploadedImagePath;

async function findAvailablePort() {
  const server = (await import("node:net")).createServer();
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const { port } = server.address();
  await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  return port;
}

async function waitForApi() {
  const timeoutAt = Date.now() + 20000;
  while (Date.now() < timeoutAt) {
    if (backend.exitCode !== null) {
      throw new Error(`Backend exited during startup.\n${backendLogs}`);
    }
    try {
      const response = await fetch(`${apiOrigin}/api/health`);
      if (response.ok) return;
    } catch {}
    await delay(150);
  }
  throw new Error(`Timed out waiting for backend startup.\n${backendLogs}`);
}

async function api(path, { method = "GET", token, body, headers = {} } = {}) {
  const response = await fetch(`${apiOrigin}/api${path}`, {
    method,
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(body && !(body instanceof FormData) ? { "Content-Type": "application/json" } : {}),
      ...headers,
    },
    body: body instanceof FormData ? body : body ? JSON.stringify(body) : undefined,
  });
  const contentType = response.headers.get("content-type") || "";
  const data = contentType.includes("application/json") ? await response.json() : await response.arrayBuffer();
  return { response, data };
}

before(async () => {
  database = await PGlite.create();
  databaseServer = new PGLiteSocketServer({ db: database, port: 0, host: "127.0.0.1", maxConnections: 1 });
  await databaseServer.start();
  databasePort = databaseServer.server.address().port;

  backend = spawn(process.execPath, ["src/index.js"], {
    cwd: new URL(".", backendDirectory),
    env: {
      ...process.env,
      PORT: String(apiPort),
      DATABASE_URL: `postgres://postgres:postgres@127.0.0.1:${databasePort}/postgres`,
      JWT_SECRET: "e2e-only-secret-that-is-never-used-outside-tests",
      ADMIN_EMAIL: "admin@e2e.danu",
      ADMIN_PASSWORD: "E2e-admin-password-2026",
      CLIENT_ORIGIN: "http://127.0.0.1:5173",
      PG_POOL_MAX: "1",
    },
    stdio: ["ignore", "pipe", "pipe"],
  });
  backend.stdout.setEncoding("utf8").on("data", (chunk) => { backendLogs += chunk; });
  backend.stderr.setEncoding("utf8").on("data", (chunk) => { backendLogs += chunk; });
  await waitForApi();
});

after(async () => {
  if (uploadedImagePath) {
    const { rm } = await import("node:fs/promises");
    await rm(uploadedImagePath, { force: true });
  }
  if (backend && backend.exitCode === null) {
    backend.kill("SIGTERM");
    await Promise.race([once(backend, "exit"), delay(3000)]);
    if (backend.exitCode === null) backend.kill("SIGKILL");
  }
  await databaseServer?.stop();
  await database?.close();
});

test("customer and admin purchase lifecycle works over the HTTP API", async () => {
  const health = await api("/health");
  assert.equal(health.response.status, 200);
  assert.deepEqual(health.data, { status: "ok" });

  const initialProducts = await api("/products");
  assert.equal(initialProducts.response.status, 200);
  assert.ok(initialProducts.data.length >= 8, "database seeds the starter catalogue");
  const search = await api("/products?search=stoneware");
  assert.equal(search.response.status, 200);
  assert.ok(search.data.some((product) => product.name === "Stoneware Table Vase"));

  const unauthenticatedAdmin = await api("/admin/products", {
    method: "POST",
    body: { name: "Blocked", price: 1, category: "Test", stock: 1 },
  });
  assert.equal(unauthenticatedAdmin.response.status, 401);

  const adminLogin = await api("/auth/login", {
    method: "POST",
    body: { email: "admin@e2e.danu", password: "E2e-admin-password-2026" },
  });
  assert.equal(adminLogin.response.status, 200);
  assert.equal(adminLogin.data.user.role, "admin");
  const adminToken = adminLogin.data.token;

  const registration = await api("/auth/register", {
    method: "POST",
    body: { name: "Test Customer", email: "customer@e2e.danu", password: "Customer-password-2026" },
  });
  assert.equal(registration.response.status, 201);
  assert.equal(registration.data.user.role, "customer");
  const customerToken = registration.data.token;

  const duplicateRegistration = await api("/auth/register", {
    method: "POST",
    body: { name: "Another Customer", email: "CUSTOMER@e2e.danu", password: "Customer-password-2026" },
  });
  assert.equal(duplicateRegistration.response.status, 409);

  const wrongPassword = await api("/auth/login", {
    method: "POST",
    body: { email: "customer@e2e.danu", password: "incorrect-password" },
  });
  assert.equal(wrongPassword.response.status, 401);

  const customerAdminAction = await api("/admin/products", {
    method: "POST",
    token: customerToken,
    body: { name: "Blocked", price: 1, category: "Test", stock: 1 },
  });
  assert.equal(customerAdminAction.response.status, 403);

  const imageForm = new FormData();
  imageForm.append("image", new Blob([
    Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a0ioAAAAASUVORK5CYII=", "base64"),
  ], { type: "image/png" }), "product.png");
  const upload = await api("/admin/uploads", { method: "POST", token: adminToken, body: imageForm });
  assert.equal(upload.response.status, 201, JSON.stringify(upload.data));
  assert.match(upload.data.image_url, /^\/api\/uploads\/[a-f0-9-]+\.png$/);
  uploadedImagePath = new URL(`../uploads/${upload.data.image_url.split("/").at(-1)}`, import.meta.url);

  const uploadedImage = await fetch(`${apiOrigin}${upload.data.image_url}`);
  assert.equal(uploadedImage.status, 200);
  assert.match(uploadedImage.headers.get("content-type"), /image\/png/);

  const invalidUploadForm = new FormData();
  invalidUploadForm.append("image", new Blob(["not an image"], { type: "text/plain" }), "bad.txt");
  const invalidUpload = await api("/admin/uploads", { method: "POST", token: adminToken, body: invalidUploadForm });
  assert.equal(invalidUpload.response.status, 400);

  const createdProduct = await api("/admin/products", {
    method: "POST",
    token: adminToken,
    body: {
      name: "E2E Test Mug",
      description: "Created by the full-stack verification",
      price: 21.5,
      category: "E2E",
      vendor: "Verification Studio",
      image_url: upload.data.image_url,
      stock: 3,
    },
  });
  assert.equal(createdProduct.response.status, 201);
  const productId = createdProduct.data.id;
  const publicProduct = await api("/products?search=E2E%20Test%20Mug");
  assert.equal(publicProduct.response.status, 200);
  assert.equal(publicProduct.data[0].id, productId);
  assert.equal(publicProduct.data[0].image_url, upload.data.image_url);

  const updatedProduct = await api(`/admin/products/${productId}`, {
    method: "PUT",
    token: adminToken,
    body: { ...createdProduct.data, name: "E2E Updated Mug", price: 21.5, stock: 3 },
  });
  assert.equal(updatedProduct.response.status, 200);
  assert.equal(updatedProduct.data.name, "E2E Updated Mug");

  const profile = await api("/me", {
    method: "PUT",
    token: customerToken,
    body: { name: "Updated Test Customer", phone: "555-0100", address: "10 Test Street" },
  });
  assert.equal(profile.response.status, 200);
  assert.equal(profile.data.phone, "555-0100");

  const newsletter = await api("/subscriptions", { method: "POST", body: { email: "news@e2e.danu" } });
  assert.equal(newsletter.response.status, 201);

  const invalidCheckout = await api("/orders", {
    method: "POST",
    token: customerToken,
    body: { items: [], shippingAddress: "10 Test Street" },
  });
  assert.equal(invalidCheckout.response.status, 400);

  const checkout = await api("/orders", {
    method: "POST",
    token: customerToken,
    body: { items: [{ productId, quantity: 2 }], shippingAddress: "10 Test Street", paymentMethod: "fake-card" },
  });
  assert.equal(checkout.response.status, 201, JSON.stringify(checkout.data));
  assert.equal(Number(checkout.data.total), 49.5, "server calculates item total and demo shipping");
  const orderId = checkout.data.id;

  const customerOrders = await api("/orders", { token: customerToken });
  assert.equal(customerOrders.response.status, 200);
  assert.equal(customerOrders.data.length, 1);
  assert.equal(customerOrders.data[0].id, orderId);

  const orderDetail = await api(`/orders/${orderId}`, { token: customerToken });
  assert.equal(orderDetail.response.status, 200);
  assert.equal(orderDetail.data.items[0].product_name, "E2E Updated Mug");
  assert.equal(orderDetail.data.items[0].quantity, 2);

  const invoice = await api(`/orders/${orderId}/invoice`, { token: customerToken });
  assert.equal(invoice.response.status, 200);
  assert.match(invoice.response.headers.get("content-type"), /application\/pdf/);
  assert.equal(Buffer.from(invoice.data).subarray(0, 5).toString(), "%PDF-");

  const stockAfterCheckout = await api("/products?search=E2E%20Updated%20Mug");
  assert.equal(stockAfterCheckout.data[0].stock, 1);
  const oversell = await api("/orders", {
    method: "POST",
    token: customerToken,
    body: { items: [{ productId, quantity: 2 }], shippingAddress: "10 Test Street" },
  });
  assert.equal(oversell.response.status, 409);

  const cancellationCheckout = await api("/orders", {
    method: "POST",
    token: customerToken,
    body: { items: [{ productId, quantity: 1 }], shippingAddress: "10 Test Street" },
  });
  assert.equal(cancellationCheckout.response.status, 201);
  const cancellationOrderId = cancellationCheckout.data.id;
  const cancellation = await api(`/admin/orders/${cancellationOrderId}`, {
    method: "PATCH",
    token: adminToken,
    body: { status: "cancelled" },
  });
  assert.equal(cancellation.response.status, 200);
  assert.equal(cancellation.data.status, "cancelled");
  const restoredStock = await api("/products?search=E2E%20Updated%20Mug");
  assert.equal(restoredStock.data[0].stock, 1, "cancelling an order restores its stock");

  const repeatedCancellation = await api(`/admin/orders/${cancellationOrderId}`, {
    method: "PATCH",
    token: adminToken,
    body: { status: "cancelled" },
  });
  assert.equal(repeatedCancellation.response.status, 200);
  const stockAfterRepeatedCancellation = await api("/products?search=E2E%20Updated%20Mug");
  assert.equal(stockAfterRepeatedCancellation.data[0].stock, 1, "repeating cancellation does not restock twice");

  const reopenCancelled = await api(`/admin/orders/${cancellationOrderId}`, {
    method: "PATCH",
    token: adminToken,
    body: { status: "processing" },
  });
  assert.equal(reopenCancelled.response.status, 409);

  const adminOrders = await api("/orders", { token: adminToken });
  assert.equal(adminOrders.response.status, 200);
  assert.equal(adminOrders.data.some((order) => order.id === orderId), true);

  const statusUpdate = await api(`/admin/orders/${orderId}`, {
    method: "PATCH",
    token: adminToken,
    body: { status: "shipped" },
  });
  assert.equal(statusUpdate.response.status, 200);
  assert.equal(statusUpdate.data.status, "shipped");

  const customers = await api("/admin/customers", { token: adminToken });
  assert.equal(customers.response.status, 200);
  assert.ok(customers.data.some((user) => user.email === "customer@e2e.danu" && user.order_count === 2));

  const deleteProduct = await api(`/admin/products/${productId}`, { method: "DELETE", token: adminToken });
  assert.equal(deleteProduct.response.status, 204);
  const deletedSearch = await api("/products?search=E2E%20Updated%20Mug");
  assert.deepEqual(deletedSearch.data, []);
});
