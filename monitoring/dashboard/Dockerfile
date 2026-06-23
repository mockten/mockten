FROM golang:1.26-alpine AS task-builder
RUN apk add --no-cache git
RUN git clone --depth=1 https://github.com/go-task/task.git /task
WORKDIR /task
RUN go get golang.org/x/crypto@latest golang.org/x/net@latest && go mod tidy && CGO_ENABLED=0 go build -o /go/bin/task ./cmd/task

FROM node:22-alpine
RUN apk update && apk upgrade --no-cache && apk add --no-cache docker-cli curl tar && npm install -g npm@latest
COPY --from=task-builder /go/bin/task /usr/local/bin/task
RUN ARCH=$(uname -m | sed 's/x86_64/x86_64/;s/aarch64/arm64/') && \
    curl -L "https://github.com/nektos/act/releases/latest/download/act_Linux_${ARCH}.tar.gz" -o /tmp/act.tar.gz && \
    tar xzf /tmp/act.tar.gz -C /usr/local/bin act && \
    rm /tmp/act.tar.gz
RUN mkdir -p /root/.config/act && printf '%s\n' \
    '-P ubuntu-latest=catthehacker/ubuntu:act-22.04' \
    '-P ubuntu-22.04=catthehacker/ubuntu:act-22.04' \
    '-P ubuntu-20.04=catthehacker/ubuntu:act-20.04' \
    > /root/.config/act/actrc
WORKDIR /app
COPY package.json .
RUN npm install
RUN npm uninstall -g npm || true
RUN rm -rf /usr/local/lib/node_modules/npm /usr/local/bin/npm /root/.npm
COPY server.js .
COPY public/ ./public/
EXPOSE 3001
CMD ["node", "server.js"]
