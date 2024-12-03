FROM bitnami/node:9 as builder
ENV NODE_ENV="production"

COPY . /app

WORKDIR /app

# root 사용자로 npm install 실행하여 권한 문제 해결
USER root
RUN npm install

FROM bitnami/node:9-prod
ENV NODE_ENV="production"

COPY --from=builder /app /app

WORKDIR /app

ENV PORT 5000
EXPOSE 5000

# 앱 실행
CMD ["npm", "start"]
