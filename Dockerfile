# One image: the Go api, the seed command and the built frontend it serves.

FROM node:22-alpine AS web
WORKDIR /src/frontend
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

FROM golang:1.26.8-alpine AS api
WORKDIR /src/backend
ENV GOTOOLCHAIN=local CGO_ENABLED=0
COPY backend/go.mod backend/go.sum ./
RUN go mod download
COPY backend/ ./
RUN go build -trimpath -ldflags="-s -w" -o /out/api ./cmd/api \
 && go build -trimpath -ldflags="-s -w" -o /out/seed ./cmd/seed

FROM gcr.io/distroless/static-debian12:nonroot
WORKDIR /app
COPY --from=api /out/api /out/seed /app/
COPY --from=web /src/frontend/dist /app/web
ENV STATIC_DIR=/app/web HTTP_PORT=8080 APP_ENV=production GIN_MODE=release
EXPOSE 8080
ENTRYPOINT ["/app/api"]
