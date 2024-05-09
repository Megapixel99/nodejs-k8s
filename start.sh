#! /bin/bash

export $(grep -v '^#' ./.env | xargs)

docker rm -f loadbalancer
docker image rm -f loadbalancer
docker build -t loadbalancer -f loadBalancer/Dockerfile .
docker image rm -f dns
docker rm -f dns_server
docker build -t dns -f dns/Dockerfile .
docker run --expose 5333 --expose 8443 --expose 5334 --name dns_server -itd dns
if [[ -z $DB_URL ]]; then
  node ./index.js -dnsServer $(docker inspect -f '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}' dns_server):5333 -dbName $(docker run -p 27017:27017 -p 27018:27018 -p 27019:27019 -p 27020:27020 -d mongo)
else
  node ./index.js -dnsServer $(docker inspect -f '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}' dns_server):5333
fi
