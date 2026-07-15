# uam

User Account Management, built on [Keycloak](https://www.keycloak.org/).

`uam` is the identity provider for the whole platform. It authenticates and authorizes buyers, sellers, and administrators, brokers social login (Google / Facebook), and is the source of truth for user records (including custom seller attributes).

## Layout

```
uam/
├── realm-export-dev.json    # Keycloak realm import for local/dev (clients, roles, groups, IdPs)
├── realm-export.json        # Keycloak realm import for other environments
├── uam.env.example          # template for the OAuth secrets injected at runtime
├── docker-entrypoint.sh     # injects secrets, imports the realm, starts Keycloak
└── Dockerfile
```

## Concepts

- **Realm & groups** — users belong to groups (`Customer`, `Seller`, `admin-group`) that grant the roles the backend services check (`user`, `seller`, `admin`).
- **Seller lifecycle** — new seller sign-ups are created **disabled** with a `status=pending` attribute and cannot sign in until an administrator approves them (enables the account). Suspended sellers are disabled *without* the pending status, which is how the Admin Portal distinguishes "pending" from "suspended".
- **Custom attributes** — sellers carry attributes such as `storeName` and `phonenum`; the realm has the *unmanaged-attribute policy* enabled so these persist.
- **Tokens** — issues access/refresh tokens via the password and refresh-token grants. The storefront, Seller Portal, and Admin Portal each keep their tokens under separate browser storage keys so sessions don't collide.

## Exposed via Kong (`/api/uam/*`)

Token issuance, userinfo, SSO auth/broker callbacks, realm roles, and the Admin REST API for user CRUD (`/api/uam/users`, `/api/uam/users/:id`, `…/execute-actions-email`). See [`apigw`](../apigw) for the full route list; Kong forwards the admin Bearer token and rewrites URIs to Keycloak's admin endpoints.

## Configuration

- Realm structure (clients, roles, groups, web origins such as `http://nginx` for containerized E2E) is defined in the `realm-export*.json` files and imported at container start.

### OAuth secrets are injected at runtime, never baked into the image

The realm templates ship with **placeholder** tokens (`GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `FACEBOOK_CLIENT_ID`, `FACEBOOK_CLIENT_SECRET`). The real Google/Facebook credentials are substituted into the realm import by `docker-entrypoint.sh` **at container startup**, read from environment variables. Nothing secret is written into the image, so the built image is safe to `docker push`. A key that is left unset keeps its placeholder and the app still boots — only that social login is disabled.

- **Local (Docker Compose):** copy `uam.env.example` to `uam.env` (gitignored) and fill in the four values. Compose loads it via `env_file` (marked `required: false`, so the file is optional). See the repository root [README](../README.md#google-authentication-setup) for where to obtain the values.
- **Kubernetes:** do **not** ship a file. Store the four keys in a `Secret` and expose them to the uam `Deployment` with `envFrom`:

  ```yaml
  envFrom:
    - secretRef:
        name: uam-oauth
  ```

  (or, equivalently, a `ConfigMap` for the non-secret client IDs plus a `Secret` for the secrets). The entrypoint reads whatever the pod's environment provides.
