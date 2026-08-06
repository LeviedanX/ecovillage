# syntax=docker/dockerfile:1.7

ARG PHP_VERSION=8.4
ARG NODE_VERSION=22

FROM node:${NODE_VERSION}-bookworm-slim AS node-runtime
FROM composer:2 AS composer-runtime

FROM php:${PHP_VERSION}-fpm-bookworm AS php-base

ENV COMPOSER_ALLOW_SUPERUSER=1 \
    COMPOSER_HOME=/tmp/composer \
    TZ=Asia/Jakarta

RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        ca-certificates \
        curl \
        git \
        libfreetype6-dev \
        libicu-dev \
        libjpeg62-turbo-dev \
        libonig-dev \
        libpng-dev \
        libwebp-dev \
        libxml2-dev \
        libzip-dev \
        tzdata \
        unzip \
    && docker-php-ext-configure gd --with-freetype --with-jpeg --with-webp \
    && docker-php-ext-install -j"$(nproc)" \
        bcmath \
        dom \
        exif \
        gd \
        intl \
        mbstring \
        opcache \
        pcntl \
        pdo_mysql \
        xml \
        xmlwriter \
        zip \
    && rm -rf /var/lib/apt/lists/*

COPY --from=composer-runtime /usr/bin/composer /usr/local/bin/composer
COPY docker/php/php.ini /usr/local/etc/php/conf.d/zz-ecovillage.ini

WORKDIR /var/www/html

FROM php-base AS development

COPY --from=node-runtime /usr/local/bin/node /usr/local/bin/node
COPY --from=node-runtime /usr/local/lib/node_modules /usr/local/lib/node_modules

RUN ln -s /usr/local/lib/node_modules/npm/bin/npm-cli.js /usr/local/bin/npm \
    && ln -s /usr/local/lib/node_modules/npm/bin/npx-cli.js /usr/local/bin/npx

COPY composer.json composer.lock package.json package-lock.json ./

RUN composer install \
        --no-interaction \
        --prefer-dist \
        --no-progress \
        --no-scripts \
    && npm ci --no-audit --no-fund

COPY . .

RUN composer dump-autoload --optimize --no-interaction \
    && mkdir -p \
        bootstrap/cache \
        storage/app/private \
        storage/app/public \
        storage/framework/cache/data \
        storage/framework/sessions \
        storage/framework/views \
        storage/logs \
    && chown -R www-data:www-data bootstrap/cache storage

EXPOSE 9000

CMD ["php-fpm", "-F"]

FROM development AS build

ARG VITE_APP_NAME=EcoVillage.id
ARG VITE_MAP_STYLE_URL=

ENV NODE_ENV=production \
    VITE_APP_NAME=${VITE_APP_NAME} \
    VITE_MAP_STYLE_URL=${VITE_MAP_STYLE_URL}

# `build:ssr` menghasilkan aset peramban sekaligus bundle render sisi server.
# Tanpa bundle itu, Inertia melewati SSR dan permintaan pertama kembali
# mengirim cangkang kosong kepada crawler.
RUN npm run build:ssr \
    && composer install \
        --no-dev \
        --no-interaction \
        --prefer-dist \
        --optimize-autoloader \
        --classmap-authoritative \
        --no-progress \
    && rm -rf node_modules /tmp/composer/cache

FROM php-base AS production

ENV APP_ENV=production \
    APP_DEBUG=false

COPY docker/php/opcache-production.ini /usr/local/etc/php/conf.d/zz-opcache-production.ini
COPY --from=build --chown=www-data:www-data /var/www/html /var/www/html

RUN chmod -R ug+rwX bootstrap/cache storage

EXPOSE 9000

CMD ["php-fpm", "-F"]

# Proses render sisi server berdiri sendiri: image PHP-FPM tidak memuat Node,
# dan bundle SSR sudah mandiri sehingga tidak memerlukan node_modules.
FROM node:${NODE_VERSION}-bookworm-slim AS ssr-production

ENV NODE_ENV=production \
    TZ=Asia/Jakarta

WORKDIR /var/www/html

COPY --from=build /var/www/html/bootstrap/ssr ./bootstrap/ssr

EXPOSE 13714

# Node menerima sinyal berhenti secara langsung, tanpa shell perantara.
CMD ["node", "bootstrap/ssr/ssr.js"]

FROM nginx:1.28-alpine AS nginx-production

COPY docker/nginx/default.conf /etc/nginx/conf.d/default.conf
COPY --from=build /var/www/html/public /var/www/html/public

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
