FROM node:22-alpine
# Install tools: docker-cli for container management, curl/tar for act download
RUN apk update && apk upgrade --no-cache && apk add --no-cache docker-cli curl tar git bash

# Install Go (needed so dashboard container can act as self-hosted runner for build jobs)
RUN ARCH=$(uname -m | sed 's/x86_64/amd64/;s/aarch64/arm64/') && \
    curl -sL "https://go.dev/dl/go1.23.4.linux-${ARCH}.tar.gz" | tar -C /usr/local -xz
ENV PATH="/usr/local/go/bin:${PATH}"

# Install task via pre-built binary (much faster than building from source)
RUN ARCH=$(uname -m | sed 's/x86_64/amd64/;s/aarch64/arm64/') && \
    curl -sL "https://github.com/go-task/task/releases/latest/download/task_linux_${ARCH}.tar.gz" -o /tmp/task.tar.gz && \
    tar xzf /tmp/task.tar.gz -C /usr/local/bin task && \
    rm /tmp/task.tar.gz

# Install act via pre-built binary
RUN ARCH=$(uname -m | sed 's/x86_64/x86_64/;s/aarch64/arm64/') && \
    curl -sL "https://github.com/nektos/act/releases/latest/download/act_Linux_${ARCH}.tar.gz" -o /tmp/act.tar.gz && \
    tar xzf /tmp/act.tar.gz -C /usr/local/bin act && \
    rm /tmp/act.tar.gz

RUN mkdir -p /root/.config/act && printf '%s\n' \
    '-P ubuntu-latest=catthehacker/ubuntu:act-22.04' \
    '-P ubuntu-22.04=catthehacker/ubuntu:act-22.04' \
    '-P ubuntu-20.04=catthehacker/ubuntu:act-20.04' \
    > /root/.config/act/actrc

WORKDIR /app
COPY package.json .
RUN npm install --omit=dev
COPY server.js .
COPY public/ ./public/
EXPOSE 3001
CMD ["node", "server.js"]
