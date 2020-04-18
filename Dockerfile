FROM node:12-alpine	

WORKDIR /app	

COPY ./package.json ./	
COPY ./package-lock.json ./	

RUN npm install --production	

COPY ./ ./	

RUN npm run build	

ENTRYPOINT ["./factoidd"]	

