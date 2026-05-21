# Pull Request Summary: Real-Time Shipment Status & Purchase History Integration

This PR replaces the placeholder mockup on the **Purchase History** page (`/order-history`) with a live tracking UI integrated with a newly developed **Go-based Shipment API** backed by MySQL. It implements real-time order status tracking with configurable automatic state progression, MinIO product image resolution, and E2E Playwright verification.

---

## 📸 UI Demonstration

Here is a visual demonstration of the implemented Purchase History page featuring multiple products at different stages in their delivery pipeline:

<!-- Note: When uploading to GitHub, upload the local file "media__1779374145834.png" to the PR description and replace the URL below -->
![Purchase History Page](file:///Users/takayukiyamamuro/.gemini/antigravity/brain/d4542fb6-e3aa-4b54-8d59-d70e4acff1b4/media__1779374145834.png)

---

## 🛠️ Summary of Changes

### 1. Database Schema Updates
We leverage the existing `Transaction` table with an additional `scheduled_start` column to control when the shipment process officially kicks off.
- **Table Definition**:
  ```sql
  CREATE TABLE IF NOT EXISTS `Transaction` (
    transaction_id VARCHAR(36) PRIMARY KEY,
    product_id     VARCHAR(36) NOT NULL,
    geo_id         VARCHAR(36) NOT NULL,
    status         ENUM('quoted','booked','picked_up','in_transit','delayed','delivered','canceled','failed') NOT NULL DEFAULT 'quoted',
    leg_type       ENUM('road','air','sea') NOT NULL DEFAULT 'road',
    scheduled_start DATETIME NULL,
    created_at     DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at     DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    KEY idx_tx_geo     (geo_id),
    KEY idx_tx_product (product_id),
    KEY idx_tx_legtype (leg_type)
  );
  ```
- **Automatic Migration**: On startup, the shipment service automatically detects if the `scheduled_start` column is missing via the `information_schema.columns` catalog and adds it dynamically if needed:
  ```sql
  ALTER TABLE Transaction ADD COLUMN scheduled_start DATETIME NULL;
  ```

### 2. Golang Shipment Service (`shipment-service`)
A new Go microservice was implemented under the `shipment/` directory.
- **POST `/v1/shipment`**:
  - Registers a new transaction inside the `Transaction` table.
  - Generates a UUID `transaction_id`.
  - Sets the initial status to `booked`.
  - Determines the `scheduled_start` date/time:
    - If `TEST_MODE=true` is set on the container environment, `scheduled_start` is set to `NULL` to bypass schedule checks and begin the shipment process immediately.
    - Otherwise, it uses the client-specified `scheduled_start` timestamp (e.g. matching business rules where shipping doesn't start same-day).
- **GET `/v1/shipment?userId={userId}`**:
  - Joins the `Transaction`, `Geo`, and `Product` tables to return all purchases for a specified customer.
  - Returns a list of purchases with details including product ID, name, status, and formatted purchase date.
- **Background Worker & Wait Times (Transitions)**:
  - A background Go routine polls the database using a configurable ticker.
  - The tick frequency is controlled by the `TICK_INTERVAL_SECONDS` environment variable (defaults to `200` seconds).
  - On every tick, it advances the status of transactions that have reached their scheduled start time (or have `NULL` start times):
    $$\text{booked} \xrightarrow{+200s} \text{picked\_up} \xrightarrow{+200s} \text{in\_transit} \xrightarrow{+200s} \text{delivered}$$
  - Since both `picked_up` and `in_transit` map to the "Shipping" UI state, the transaction stays in the "Shipping" phase for **2 ticks (400 seconds)** before transitioning to "Delivered".

  #### Status Progression Timeline (TICK_INTERVAL_SECONDS = 200)

  | Elapsed Time | DB Status | UI Display Status | Progress Bar Value |
  | :--- | :--- | :--- | :--- |
  | **0s to 200s** | `booked` | **Order Confirming** | `15%` |
  | **200s to 400s** | `picked_up` | **Shipping** | `55%` |
  | **400s to 600s** | `in_transit` | **Shipping** | `55%` |
  | **600s onwards** | `delivered` | **Delivered** | `100%` |


### 3. API Gateway Routing (Kong)
Configured Kong API gateway to route traffic from the frontend to the new Shipment microservice:
- **Routing Rules**: Exposes the shipment service endpoint externally via `GET/POST /api/shipment`, mapping to the backend endpoint `http://shipment-service.default.svc.cluster.local:8080/v1/shipment`.

### 4. Frontend Integration (`ecfront2`)
The user interface on the Purchase History page (`/order-history`) has been rewritten to fetch dynamic real-time statuses:
- **Dynamic Mapping**:
  The DB transaction status is mapped to UI states and progress indicators:
  - `booked` $\rightarrow$ **"Order Confirming"** (Progress Bar: 15%)
  - `picked_up` OR `in_transit` $\rightarrow$ **"Shipping"** (Progress Bar: 55%)
  - `delivered` $\rightarrow$ **"Delivered"** (Progress Bar: 100%)
- **Image Resolution**: Product images are dynamically requested from the MinIO storage backend via `/api/storage/{product_id}.png`. If a custom image does not exist, the component gracefully falls back to a default product placeholder SVG (`photo.svg`).
- **Dynamic Empty State**: If a user has zero purchases, the page displays a custom message: *"There are no purchase history records."* instead of a broken list or placeholder.

### 5. Playwright E2E Test Suite (Scenario 4)
We added a new end-to-end integration test file under `ecfront2/tests/scenario4-purchase-history.spec.ts`.
- **Flow**:
  1. Accesses `/api/test/auth-backdoor` to authenticate the user bypass.
  2. Navigates to `/order-history`.
  3. Verifies that the "Purchase History" header is visible and the loading state dismisses properly.
  4. Asserts that the empty state is not visible (provided that Scenario 1-3 have run first and created purchases).
  5. Asserts that purchase item rows and status trackers are visible.
- **Dependencies**: Executed sequentially after Scenario 1-3 to guarantee that real purchased goods exist in the DB for verification.

### 6. CI/CD Integration
- **GitHub Actions Workflows**:
  - Added `build_shipment` and `push_snapshot_container_shipment` jobs to `.github/workflows/ci.yml` to compile the shipment code and build/push snapshot docker containers (`ghcr.io/.../shipment:latest`) on pushes to the `main` branch.
  - Added `release-shipment` job to `.github/workflows/release.yml` to build and publish versioned release docker containers (`ghcr.io/.../shipment:release-v*`) on workflow dispatch.
- **Go Workspace**:
  - Registered `./shipment` in the root `go.work` file to ensure the module path is resolved correctly during CI lint/build processes.

---

## 🚀 Running and Verifying Locally

1. **Build and Run All Services**:
   Use `Taskfile` to spin up containers with `TEST_MODE=true` enabled for the shipment service:
   ```bash
   task build
   ```
2. **Execute E2E Integration Tests**:
   To run the newly added E2E tests along with existing scenarios:
   ```bash
   npx playwright test
   ```
3. **Run CI Workflows Locally**:
   To run the GitHub Actions CI workflow locally using `act` (requires `act` installed):
   ```bash
   task ci
   ```

