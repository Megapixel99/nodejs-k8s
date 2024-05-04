# Kubernetes in NodeJS

This project was/is an attempt to recreate the core functionality of [v1.29.1 Kubernetes](https://v1-29.docs.kubernetes.io/) in NodeJS, while being fully compatible with the [`kubectl` CLI](https://kubernetes.io/docs/reference/kubectl/). Though this project only implements some resources, the resources which were partially/fully implemented seem to be the most used (i.e. Pods, Services, etc) and the others may be implemented in the future.

### Resources Partially Implemented
* Pod (volume mounts are not supported)
* ClusterRole
* ClusterRoleBinding
* Ingress
* Role
* RoleBinding
* Endpoints (untested)
* CertificateSigningRequest

### Resources Fully Implemented
* ConfigMap
* Secret
* Deployment
* Namespace
* Service

## Requirements
* [NodeJS v20](https://nodejs.org/dist/v20.0.0/) or higher
* [Docker Engine v25.0.3](https://docs.docker.com/engine/install/) or higher
* A [MongoDB](https://www.mongodb.com/docs/manual/installation/) instance

###### It is also recommended you install [kubectl](https://kubernetes.io/docs/tasks/tools/), though it is not required

## How to use
1. Install NodeJS and Docker
2. Install the project dependencies by running `npm i`
3. Create an `.env` file and set `DB_URL` to your `MongoDB` instance
4. Run `npm start` (you may need to allow the start script to run by modifying the permissions of `start.sh` with `chmod`)
5. Set your `kubectl` to use this project by running `kubectl config use-context /localhost:8080/admin` in your shell
6. Create Kubernetes resources with `kubectl`

Upon running the project you can use the examples in `examples/helloworld` or your own YAML to create resources.

Feel free to open an issue and/or make a PR if something is broken.

Licensed under the MIT License, full license is available in `LICENSE.md`
