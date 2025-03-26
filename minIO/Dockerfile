FROM quay.io/minio/minio

COPY photos /photos
COPY init.sh /init.sh

ENTRYPOINT ["/bin/sh", "/init.sh"]