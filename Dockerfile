# 빌드 단계
FROM bitnami/node:18 as builder
ENV NODE_ENV="production"

COPY . /app

WORKDIR /app

USER root
RUN npm install

# 프로덕션 단계
FROM node:18-slim
ENV NODE_ENV="production"

COPY --from=builder /app /app


WORKDIR /app

ENV PORT 5000
EXPOSE 5000

USER node

# 앱 실행
CMD ["npm", "start"]
