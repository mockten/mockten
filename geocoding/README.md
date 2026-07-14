# geocoding

Address geocoding service (Go).

`geocoding` resolves user/shipping addresses into structured geographic data (including country code) using a [Nominatim](https://nominatim.org/) backend. Country codes it produces are used elsewhere in the platform — for example, `sale` uses the destination country to flag orders shipping to the EU.

## Key functions

- `buildParams` — builds the Nominatim query parameters from an address request (country, state/prefecture, city, town/street).
- `generateUUID` — generates identifiers for geocoding records.

## Running tests

```sh
cd geocoding
GOWORK=off go test ./...
```

Unit tests cover UUID generation. Tests run automatically in CI (`build_geocoding` job). The module is built with `GOWORK=off` so it resolves its own dependencies independently of the workspace.
