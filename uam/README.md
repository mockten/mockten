# uam

User Account Management, built on [Keycloak](https://www.keycloak.org/).

`uam` is the identity provider for the whole platform. It authenticates and authorizes buyers, sellers, and administrators, and brokers social login (Google / Facebook).

## Concepts

- **Realm & groups** — users belong to groups (`Customer`, `Seller`, `admin-group`) that grant roles used by the backend services.
- **Seller lifecycle** — new seller sign-ups are created **disabled** with a `status=pending` attribute and cannot sign in until an administrator approves them (enables the account). Suspended sellers are disabled without the pending status.
- **Custom attributes** — sellers carry attributes such as `storeName` and `phonenum` (unmanaged-attribute policy is enabled so these persist).
- **Tokens** — issues access/refresh tokens via the password and refresh-token grants; the storefront, Seller Portal, and Admin Portal each keep their tokens under separate storage keys.

## Configuration

- `config.json` — realm/client configuration, including the Google and Facebook identity-provider Client ID/secret (see the repository root [README](../README.md#google-authentication-setup) for setup).

## Related

- The API gateway [`apigw`](../apigw) exposes `uam` under `/api/uam/*` and forwards its tokens to downstream services.
