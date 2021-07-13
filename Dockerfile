FROM node:14-alpine	

ENV NODE_ENV="production"

WORKDIR /app	

COPY ./package.json ./	
COPY ./package-lock.json ./	

RUN npm install --production	

COPY ./src ./tsconfig.json ./factoidd ./

RUN npm run build	

ENV FACTOIDD_DATA_DIR="/var/lib/factoidd"
ENV FACTOIDD_CONFIG_DIR="/etc/factoidd"

RUN mkdir "/var/lib/factoidd"
RUN mkdir "/etc/factoidd"

ENTRYPOINT ["./factoidd"]	

