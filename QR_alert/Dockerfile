# Dockerfile for QRally Service
FROM node:20

# タイムゾーンをJSTに設定
ENV TZ=Asia/Tokyo
RUN ln -snf /usr/share/zoneinfo/$TZ /etc/localtime && echo $TZ > /etc/timezone

WORKDIR /app
COPY ./QR_alert/package.json ./
RUN npm install --legacy-peer-deps
COPY ./QR_alert ./
EXPOSE 5000
CMD ["npm", "run", "dev"]
