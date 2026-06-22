FROM golang:1.26-alpine AS gosu-builder
RUN CGO_ENABLED=0 go install github.com/tianon/gosu@latest

FROM mysql:8.4
COPY --from=gosu-builder /go/bin/gosu /usr/local/bin/gosu
RUN rm -rf /usr/lib/mysqlsh
COPY init.sql /docker-entrypoint-initdb.d/