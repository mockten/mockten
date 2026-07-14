# common

Shared Go libraries used across the mockten backend services.

`common` holds reusable code so the individual Go services don't duplicate cross-cutting logic.

## Packages

- `auth/` — JWT / bearer-token helpers used to authenticate requests forwarded by the API gateway. Includes:
  - `bearerTokenFromHeader` — extracts a bearer token from an `Authorization` header.
  - `jwtHeaderInfo` — inspects a JWT's header.
  - `buildJWKSURL` — builds the JWKS endpoint URL for signature verification.

## Running tests

```sh
cd common
go test ./...
```

Unit tests cover the bearer-token parsing helper.
