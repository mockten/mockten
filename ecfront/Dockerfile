# Build stage
FROM node:lts AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm install
COPY . ./

# Vite inlines VITE_* at build time, so the Stripe publishable key has to be
# present *here*: an image built without it silently ships a frontend whose card
# form can never submit. The key is deliberately not kept in the repo — CI passes
# it from a GitHub secret (see .github/workflows/release.yml) and local dev reads
# it from the gitignored ecfront/.env. Fail loudly rather than build a dud image.
ARG VITE_STRIPE_PUBLIC_KEY
RUN case "${VITE_STRIPE_PUBLIC_KEY}" in \
      "" | pk_test_your_* | *dummy*) \
        echo "ERROR: --build-arg VITE_STRIPE_PUBLIC_KEY=pk_test_... is required." >&2; \
        echo "       Got: '${VITE_STRIPE_PUBLIC_KEY:-<empty>}'. Without a real publishable" >&2; \
        echo "       key the built app cannot save cards or check out." >&2; \
        exit 1 ;; \
    esac && \
    printf '\nVITE_STRIPE_PUBLIC_KEY="%s"\n' "${VITE_STRIPE_PUBLIC_KEY}" >> .env.development

RUN npm run build:dev

# Belt and braces: if the key didn't reach the bundle, don't ship the image.
RUN grep -rq "${VITE_STRIPE_PUBLIC_KEY}" dist/assets \
    || (echo "ERROR: Stripe publishable key missing from the built bundle." >&2; exit 1)

# Execution Stage
FROM nginx:1.29.5-alpine3.23
COPY --from=build /app/dist /usr/share/nginx/html
COPY default.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
