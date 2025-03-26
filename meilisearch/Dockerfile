FROM getmeili/meilisearch

COPY products.json /data/products.json
COPY init.sh /init.sh

ENTRYPOINT /bin/sh /init.sh