#! /bin/bash

export $(grep -v '^#' ./.env | xargs)

# docker rm -f loadbalancer
docker image rm -f loadbalancer
docker build -t loadbalancer -f loadBalancer/Dockerfile .
# docker image rm -f dns
docker rm -f dns_server
docker build -t dns -f dns/Dockerfile .
if [[ -z $DB_URL ]]; then
  node ./index.js -dbName $(docker run -p 27017:27017 -p 27018:27018 -p 27019:27019 -p 27020:27020 -d mongo)
else
  node ./index.js
fi
