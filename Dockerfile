FROM node:12-alpine

WORKDIR /app

RUN apk update && \
    apk upgrade && \
    apk add git

COPY ./package.json ./
COPY ./package-lock.json ./

RUN npm install --production

COPY ./ ./

RUN npm run build

CMD ["node", "factoidd"]

VOLUME [ "/config" ]

VOLUME [ "/database" ]