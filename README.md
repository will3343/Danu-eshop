# Danu E-shop

A JavaScript full-stack demo storefront: React + Vite frontend, Express API, and PostgreSQL database.

## Features

- Responsive storefront, product search, categories, and vendor information
- Customer registration/sign-in, profile editing, cart, and checkout
- Order history, status tracking, and downloadable PDF invoices
- Admin sign-in, product CRUD with image URL or local image upload, order status management, and customer list
- Admin-added products immediately appear in the storefront shop, category filters, and product search
- English/Tigrigna language toggle for the storefront, customer account, checkout, and admin interface; the choice is saved in the browser
- Newsletter subscriptions
- Seed product catalogue for a fresh database

## Project folders

```text
Danu-eshop/
├── frontend/       React and Vite application
├── backend/        Express API, PostgreSQL access, and uploaded images
├── docker-compose.yml
├── package.json    Root workspace scripts
└── .env.example    Local environment template
```

Install dependencies and run the workspace commands from the project root. The frontend and backend also have their own `package.json` files inside their respective folders.

## Download and install

### 1. Get the project files

Download the project as a ZIP and extract it, or open the existing `Danu-eshop` project folder in VS Code. The root contains separate `frontend/` and `backend/` folders plus shared project configuration. In VS Code, choose **File → Open Folder…** and select the project root. Open a terminal with **Terminal → New Terminal**; run the commands below from the root (the folder containing this README and the root `package.json`).

### 2. Install the required software

- Install **Node.js 20 or newer** from [nodejs.org](https://nodejs.org/). npm is included with Node.js.
- For the included database setup, install and launch [Docker Desktop](https://www.docker.com/products/docker-desktop/). Alternatively, install PostgreSQL 14 or newer and create a database named `danu_eshop`.

Check Node.js and npm are available in the VS Code terminal:

```sh
node --version
npm --version
```

### 3. Configure the environment

Create a local `.env` file by copying `.env.example` in the project root.

macOS/Linux:

```sh
cp .env.example .env
```

Windows PowerShell:

```powershell
Copy-Item .env.example .env
```

Open `.env` and set `DATABASE_URL`, `JWT_SECRET`, `ADMIN_EMAIL`, and `ADMIN_PASSWORD`. When using the included Docker database, the example database URL matches its defaults. Use a private, randomly generated `JWT_SECRET` and a strong admin password; `.env` is local configuration and must not be shared or committed.

### 4. Start the database

Make sure Docker Desktop is running, then start PostgreSQL from the project root:

```sh
docker compose up -d db
```

If you installed PostgreSQL directly instead, start that service and make sure `DATABASE_URL` in `.env` points to your `danu_eshop` database.

### 5. Install project packages

From the project root, install the frontend and backend dependencies:

```sh
npm install
```

### 6. Run frontend and backend

Start both development servers together:

```sh
npm run dev
```

- **Frontend:** open [http://localhost:5173](http://localhost:5173) in your browser.
- **Backend API:** runs at [http://localhost:4000](http://localhost:4000).
- **Backend health check:** open [http://localhost:4000/api/health](http://localhost:4000/api/health); it should return `{"status":"ok"}`.

Keep the terminal open while using the app. Press **Ctrl+C** in that terminal to stop both servers. The API creates its tables and starter products the first time it connects to the database.

#### Run frontend and backend in separate terminals

If you prefer separate VS Code terminals, run each command from the project root and leave both terminals running:

Terminal 1 — backend API:

```sh
npm run dev -w backend
```

Terminal 2 — React frontend:

```sh
npm run dev -w frontend
```

The frontend development server forwards `/api` requests to the backend on port 4000.
For local setups where the API uses another port, set `API_PROXY_TARGET` when starting the frontend, for example `API_PROXY_TARGET=http://localhost:4100 npm run dev -w frontend` (PowerShell: `$env:API_PROXY_TARGET="http://localhost:4100"; npm run dev -w frontend`).

### Admin sign-in

Use the email and password set as `ADMIN_EMAIL` and `ADMIN_PASSWORD` in your `.env` file. Admin accounts are created/configured by the server and cannot be registered through the customer sign-up form. Restart the backend after changing the admin environment values.

### Add products and images

Sign in as an admin, open **Admin → Products → Add product**, and enter the product details. Add an image either by pasting an image URL or selecting a local JPG, PNG, WebP, or GIF file up to 5 MB. If both are provided, the uploaded file is used. Select **Save product** to publish it to **Shop all**, category filters, and search so customers can add it to their cart.

Uploaded images are stored in `backend/uploads`; that folder is excluded from Git. Back it up and configure persistent file storage when deploying the backend so uploaded product images remain available across deployments.

### Production frontend build

To check or generate the optimized frontend files:

```sh
npm run build
```

The generated static site is in `frontend/dist`. The API can be started separately with `npm start` from the project root; production hosting still needs a configured PostgreSQL database and appropriate frontend/API deployment settings.

## Quality check and known limitations

Run the following checks from the project root:

```sh
npm run build
node --check backend/src/index.js
npm audit
npm run test:e2e
```

### Verified

- `npm run build` successfully creates the optimized React/Vite frontend.
- `node --check backend/src/index.js` validates the backend entry point syntax.
- `npm audit` reported zero known dependency vulnerabilities at the last check; rerun it after dependency changes for a current result.
- `npm run test:e2e` starts the real Express backend against an embedded PGlite database and exercises the HTTP API, including customer/admin authentication and authorization, search, product create/update/delete, image upload and serving, profile updates, subscriptions, checkout validation and stock handling, order history/details/status changes, PDF invoice generation, and cancellation/restocking.
- Browser verification covered admin sign-in and product creation, storefront search and cart, customer registration, checkout, order listing/details, and the invoice download action.
- Product API failures show an error and retry control instead of appearing as an empty successful catalogue. Admin accounts are provisioned through server environment configuration, not customer registration.

The automated E2E suite uses PGlite's PostgreSQL-compatible wire protocol; it does not replace a deployment check against the intended native PostgreSQL version. Browser checks are manual and are not an automated browser test suite. No CI pipeline is configured.

### Before production

- **Database deployment:** run migrations/initialization and the E2E suite against the actual PostgreSQL version and configuration used for deployment.
- **Authentication hardening:** the browser stores the JWT in `localStorage`, and login requests have no rate limiting. Review token storage, rate limiting, session revocation, and other authentication protections for the deployment threat model.
- **Accessibility:** forms and landmarks have labels, but the sign-in overlay still needs complete dialog semantics and keyboard focus management. Perform keyboard-only and screen-reader testing.
- **Deployment configuration:** the `/api` proxy in Vite is a development setup. Configure a production frontend/API origin, HTTPS, CORS allow-list, secrets, database access, logging, backups, and monitoring for the chosen hosting platform.
- **Uploaded image durability:** local uploads are stored in `backend/uploads`. Use persistent storage or an object-storage service in production, and include uploaded assets in backup/restore procedures.
- **Payments and shipping:** the checkout is a demo and takes no money; displayed tracking is a demo order reference/status, not carrier tracking. Integrate a payment provider and shipping/tracking service before representing these as live services.

The included Compose file is intended for local development. Its sample database credentials are not production credentials; replace them and use managed secrets and appropriately restricted networking for any deployment.

## Demo payment

Checkout creates a database order and reserves the current product stock. The `demo` payment method does **not** collect or process money. Connect a PCI-compliant payment provider and implement its verified server-side webhook before accepting real payments.

## Languages

Use the language button in the header to switch the interface between English and Tigrigna. The selection is saved in the browser and restored on the next visit. Interface labels, navigation, forms, notices, informational pages, built-in product names, and standard product categories are translated. Custom product names, vendor names, and descriptions supplied by the store are shown as entered.

## API outline

- `GET /api/products?search=...`
- `POST /api/auth/register`, `POST /api/auth/login`
- `GET /api/me`, `PUT /api/me`
- `POST /api/orders`, `GET /api/orders`, `GET /api/orders/:id`, `GET /api/orders/:id/invoice`
- Admin: `/api/admin/uploads`, `/api/admin/products`, `/api/admin/orders/:id`, `/api/admin/customers`
- `POST /api/subscriptions`
