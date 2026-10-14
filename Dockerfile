# Builds the extension and serves the landing site (the same content the GitHub Pages
# workflow publishes) plus a downloadable, unpacked-installable extension zip.
#
#   docker build -t ai-writing-assistant .
#   docker run --rm -p 8080:80 ai-writing-assistant   # http://localhost:8080

FROM node:22-alpine AS build
WORKDIR /repo
RUN corepack enable && apk add --no-cache zip
COPY . .
RUN pnpm install --frozen-lockfile \
 && node scripts/generate-icons.mjs \
 && pnpm --filter @awa/extension build \
 && cd extension/dist && zip -qr /repo/ai-writing-assistant.zip .

FROM nginx:1.27-alpine
COPY apps/landing/ /usr/share/nginx/html/
COPY store/screenshots/ /usr/share/nginx/html/screenshots/
COPY store/privacy-policy.md /usr/share/nginx/html/privacy-policy.md
COPY --from=build /repo/ai-writing-assistant.zip /usr/share/nginx/html/download/ai-writing-assistant.zip
EXPOSE 80
HEALTHCHECK CMD wget -qO- http://localhost/ >/dev/null || exit 1
