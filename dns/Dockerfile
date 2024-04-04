FROM node:latest

COPY dns/package.json ./package.json

RUN npm i

COPY dns/index.js ./index.js

COPY dns/db.js ./db.js

CMD ["node", "index.js"]
