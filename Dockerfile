FROM node:25 AS ui_builder

WORKDIR /build/ui

COPY ./ui/admin/package.json        .
COPY ./ui/admin/package-lock.json   .

RUN npm install --no-audit

COPY ./ui/admin .

RUN npm run build

FROM golang:1.26-alpine3.23 AS builder

RUN apk update && apk add build-base

WORKDIR /build

COPY go.mod go.mod
COPY go.sum go.sum
RUN go mod download

COPY . .
RUN go build -o app .

FROM alpine:3

RUN apk add --no-cache ffmpeg

WORKDIR /app

COPY --from=ui_builder /build/ui/dist ui/admin/dist
COPY --from=builder /build/app app

EXPOSE 8080

CMD [ "/app/app" ]

### BUILD ###
# export x_docker_http_proxy="http://host.docker.internal:1080"
# export x_docker_image_name="allape/homesong"
# export x_docker_registry_prefix="docker-registry.lan.allape.cc/"
# export x_docker_registry_image_name="$x_docker_registry_prefix$x_docker_image_name"

# docker build --platform linux/amd64 --build-arg http_proxy=$x_docker_http_proxy --build-arg https_proxy=$x_docker_http_proxy -f Dockerfile -t $x_docker_image_name .
# docker tag $x_docker_image_name $x_docker_registry_image_name && docker push $x_docker_registry_image_name

# sudo docker pull $x_docker_registry_image_name && sudo docker tag $x_docker_registry_image_name $x_docker_image_name
# sudo docker compose -f docker.compose.yaml up -d

