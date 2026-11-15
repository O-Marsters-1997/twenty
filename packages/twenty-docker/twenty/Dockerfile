# ===========================================================================
# Dependency stages
# ===========================================================================

FROM node:24.19.0-alpine3.23@sha256:244cc2b53f46f9e876304391d17682b0ddae9ac33491f4857e25e35a36ba7995 AS front-deps

WORKDIR /app

RUN npm install --global bun@1.3.11

COPY ./package.json ./bun.lock ./bunfig.toml ./tsconfig.base.json ./nx.json /app/
COPY ./patches /app/patches

# bun validates every workspace listed in package.json, even under --filter
COPY ./packages/twenty-e2e-testing/package.json /app/packages/twenty-e2e-testing/
COPY ./packages/twenty-emails/package.json /app/packages/twenty-emails/
COPY ./packages/twenty-front/package.json /app/packages/twenty-front/
COPY ./packages/twenty-oxlint-rules/package.json /app/packages/twenty-oxlint-rules/
COPY ./packages/twenty-server/package.json /app/packages/twenty-server/
COPY ./packages/twenty-shared/package.json /app/packages/twenty-shared/
COPY ./packages/twenty-ui/package.json /app/packages/twenty-ui/
COPY ./packages/twenty-utils/package.json /app/packages/twenty-utils/


RUN bun install --frozen-lockfile --filter . --filter twenty-front --filter twenty-ui --filter twenty-shared && bun pm cache rm && npx nx reset


FROM front-deps AS twenty-front-build

COPY ./packages/twenty-front /app/packages/twenty-front
COPY ./packages/twenty-ui /app/packages/twenty-ui
COPY ./packages/twenty-shared /app/packages/twenty-shared
RUN npx nx run twenty-front:lingui:extract && \
    npx nx run twenty-front:lingui:compile
# To skip the memory-intensive frontend build, pre-build on the host:
#   npx nx build twenty-front
# The check below will use packages/twenty-front/build/ if it already exists.
RUN if [ -d /app/packages/twenty-front/build ]; then \
      echo "Using pre-built frontend from host"; \
    else \
      NODE_OPTIONS="--max-old-space-size=8192" npx nx build twenty-front; \
    fi


FROM golang:1.26-alpine3.23 AS go-build

WORKDIR /src

COPY ./packages/twenty-server-go/go.mod ./packages/twenty-server-go/go.sum ./
RUN go mod download

COPY ./packages/twenty-server-go ./
RUN CGO_ENABLED=0 go build -trimpath -ldflags="-s -w" -o /out/ ./cmd/api ./cmd/worker ./cmd/migrate


# ===========================================================================
# Target: twenty-server (server only, no frontend)
#   docker build --target twenty-server -f packages/twenty-docker/twenty/Dockerfile .
# ===========================================================================

FROM alpine:3.23 AS twenty-server

RUN apk add --no-cache \
    'ca-certificates' \
    'curl>=8.22.0-r0' \
    'libcrypto3>=3.5.8-r0' \
    'libssl3>=3.5.8-r0'

WORKDIR /app

ARG APP_VERSION
ENV APP_VERSION=$APP_VERSION

COPY --from=go-build /out/api /out/worker /out/migrate /app/
COPY ./packages/twenty-docker/twenty/entrypoint.sh /app/entrypoint.sh
RUN chmod +x /app/entrypoint.sh && \
    mkdir -p /app/.local-storage && \
    chown 1000:1000 /app/.local-storage

LABEL org.opencontainers.image.source=https://github.com/twentyhq/twenty
LABEL org.opencontainers.image.description="Twenty server image (no frontend)."

USER 1000

CMD ["/app/api"]
ENTRYPOINT ["/app/entrypoint.sh"]


# ===========================================================================
# Target: twenty-server-aws (server only + aws-cli, no frontend)
#   docker build --target twenty-server-aws -f packages/twenty-docker/twenty/Dockerfile .
# ===========================================================================

FROM twenty-server AS twenty-server-aws

USER root
RUN apk add --no-cache aws-cli
USER 1000


# ===========================================================================
# Target: twenty (server + frontend)
#   docker build --target twenty -f packages/twenty-docker/twenty/Dockerfile .
# ===========================================================================

FROM twenty-server AS twenty

COPY --chown=1000 --from=twenty-front-build /app/packages/twenty-front/build /app/front

LABEL org.opencontainers.image.description="Twenty image with backend and frontend."


# ===========================================================================
# Target: twenty-aws (server + frontend + aws-cli)
#   docker build --target twenty-aws -f packages/twenty-docker/twenty/Dockerfile .
# ===========================================================================

FROM twenty AS twenty-aws

USER root
RUN apk add --no-cache aws-cli
USER 1000
