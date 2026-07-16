// Runtime configuration for the storefront.
//
// The published image has to be environment-agnostic: the same artifact should
// run in dev, staging and prod, so nothing environment-specific may be baked
// into it. Vite inlines `import.meta.env.VITE_*` at *build* time, which would do
// exactly that — the key ends up inside dist/assets and the image is pinned to
// one environment (and carries a credential).
//
// So in a container the values arrive at *startup* instead: docker-entrypoint.sh
// renders /config.js from the container's environment before nginx serves
// anything, and index.html loads it ahead of the bundle.
//
// `npm run dev` has no entrypoint and serves public/config.js (which leaves the
// object empty), so local development falls back to import.meta.env — i.e. the
// gitignored ecfront/.env.

declare global {
  interface Window {
    __APP_CONFIG__?: Record<string, string | undefined>;
  }
}

const runtimeConfig = (typeof window !== 'undefined' && window.__APP_CONFIG__) || {};

/** Stripe publishable key. Injected at container start; falls back to .env in dev. */
export const STRIPE_PUBLIC_KEY: string =
  runtimeConfig.STRIPE_PUBLIC_KEY ||
  (import.meta.env.VITE_STRIPE_PUBLIC_KEY as string | undefined) ||
  '';

if (!STRIPE_PUBLIC_KEY) {
  // Loud, because the failure it causes is silent: Stripe.js simply refuses to
  // create a PaymentMethod and the card form never submits.
  console.error(
    '[config] No Stripe publishable key. Set STRIPE_PUBLIC_KEY on the container, ' +
      'or VITE_STRIPE_PUBLIC_KEY in ecfront/.env for local dev. Card payments will not work.',
  );
}
