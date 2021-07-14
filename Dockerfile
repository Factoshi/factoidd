FROM node:14-alpine	as Builder

WORKDIR /build	

COPY ./package.json ./package-lock.json ./	

RUN npm install	

COPY ./src ./src
COPY ./tsconfig.json  ./
COPY ./factoidd ./

RUN npm run build	

FROM node:14-alpine

ENV NODE_ENV="production"
ENV FACTOIDD_DATA_DIR="/var/lib/factoidd"
ENV FACTOIDD_CONFIG_DIR="/etc/factoidd"

WORKDIR /app	

COPY --from=Builder /build/build ./build
COPY --from=Builder /build/factoidd /build/package.json /build/package-lock.json ./

RUN npm install	--production
RUN mkdir "/var/lib/factoidd"
RUN mkdir "/etc/factoidd"

CMD ["./factoidd"]