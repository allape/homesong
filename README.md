# Home Song

Song/Music Management for Home NAS.

The UI is not designed for "to client" usage, more like ERP style.

## Screenshots

![img.png](examples/pc-dark-en.png)

![zh.png](examples/pc-dark-zh.png)

![iPhone-zh.jpeg](examples/mobile-light-zh.jpeg)

### Start

All available docker images are
in [https://github.com/allape/homesong/pkgs/container/homesong](https://github.com/allape/homesong/pkgs/container/homesong).

#### MySQL Mode

```shell
docker compose -f docker.compose.yaml up -d
```

#### SQLite / Standalone Mode

```shell
docker run -d --name homesong \
  -p 8080:8080 \
  -v "$(pwd)/database:/app/database" \
  -v "$(pwd)/static:/app/static" \
  ghcr.io/allape/homesong:main
```

### Dev

#### Required External Programs

- [FFmpeg](http://ffmpeg.org/)

#### Backend

```shell
go run .
```

#### Frontend

```shell
cd ui
npm i
npm run dev
```

### Build

See [Dockerfile](Dockerfile) or [docker.yaml](.github/workflows/docker.yaml)

# Credits

- [favicon.png](asset/favicon.png): https://www.irasutoya.com/2018/01/cd.html
