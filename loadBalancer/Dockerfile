FROM node:latest

COPY loadBalancer/package.json ./package.json

ENV PORTS ''
ENV PODS ''
ENV DNS_SERVER ''

RUN npm i

COPY loadBalancer/index.js ./index.js

CMD ["node", "index.js"]
