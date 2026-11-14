FROM node:20-alpine AS builder
WORKDIR /app

# Instalar dependencias del sistema si fueran necesarias
RUN apk add --no-cache libc6-compat

COPY package*.json ./
RUN npm ci

COPY . .

# Deshabilitar telemetría de Next.js durante build
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/scripts ./scripts

EXPOSE 3000
CMD ["npm", "run", "start"]
