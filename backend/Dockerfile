FROM golang:1.21-alpine AS builder

WORKDIR /app

# Download PocketBase
RUN apk add --no-cache wget unzip
RUN wget https://github.com/pocketbase/pocketbase/releases/download/v0.20.4/pocketbase_0.20.4_linux_amd64.zip && \
    unzip pocketbase_0.20.4_linux_amd64.zip && \
    rm pocketbase_0.20.4_linux_amd64.zip

# Production image
FROM alpine:3.18

WORKDIR /pb

# Copy PocketBase binary
COPY --from=builder /app/pocketbase /pb/pocketbase

# Copy data and config
COPY pb_data /pb/pb_data
COPY pb_hooks /pb/pb_hooks
COPY pb.yml /pb/pb.yml

RUN apk add --no-cache ca-certificates

EXPOSE 8090

# Run PocketBase
CMD ["/pb/pocketbase", "serve", "--http=0.0.0.0:8090"]
