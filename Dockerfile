FROM bitnami/node:9 as builder
ENV NODE_ENV="production"

COPY . /app

WORKDIR /app

RUN npm install
FROM bitnami/node:9-prod
ENV NODE_ENV="production"
COPY --from=builder /app /app
WORKDIR /app
ENV PORT 5000
EXPOSE 5000
    
CMD ["npm", "start"]