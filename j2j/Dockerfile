FROM golang:1.21.4 as builder
WORKDIR /
COPY . .
RUN go build .

# As runner
FROM alpine:3.18.2
RUN apk --no-cache add ca-certificates &&\
    apk add gcompat
COPY --from=builder  /j2j .
ENTRYPOINT ["sleep", "30"]