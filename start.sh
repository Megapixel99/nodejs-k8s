docker rm -f loadbalancer
docker image rm -f loadbalancer
docker build -t loadbalancer -f loadBalancer/Dockerfile .
docker image rm -f dns
docker rm -f dns_server
docker build -t dns -f dns/Dockerfile .
docker run --expose 5333 --expose 8443 --expose 5334 --name dns_server -itd dns
node ./index.js -dnsServer $(docker inspect -f '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}' dns_server):5333
