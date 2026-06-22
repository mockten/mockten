FROM golang:1.26-alpine AS gosu-builder
RUN CGO_ENABLED=0 go install github.com/tianon/gosu@latest

FROM mongo:latest
COPY --from=gosu-builder /go/bin/gosu /usr/local/bin/gosu
RUN rm -f /usr/bin/mongofiles /usr/bin/mongoimport /usr/bin/mongorestore /usr/bin/mongostat /usr/bin/mongotop /usr/bin/bsondump /usr/bin/mongoexport /usr/bin/mongoldap /usr/bin/mongoprep
COPY init-mongo.js /docker-entrypoint-initdb.d/init-mongo.js
EXPOSE 27017