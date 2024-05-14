const router = require('express').Router();
const { CertificateSigningRequest } = require('../objects');
const { general, openapi } = require('../middleware');

const { apiCertificatesK8sIoApiV3, apiV1OpenApiV3, validSchema } = openapi;

let routes = [`/apis/${CertificateSigningRequest.apiVersion}/certificatesigningrequests`];

router.get(routes.map((e) => `${e}/:name`), validSchema(apiCertificatesK8sIoApiV3), general.findOne(CertificateSigningRequest));

router.get(['/api/v1/certificatesigningrequests', ...routes], validSchema(apiV1OpenApiV3), general.list(CertificateSigningRequest));

router.post(routes, validSchema(apiCertificatesK8sIoApiV3), general.save(CertificateSigningRequest));

router.put(routes, validSchema(apiCertificatesK8sIoApiV3), general.update(CertificateSigningRequest));

router.patch(routes.map((e) => `${e}/:name`), validSchema(apiCertificatesK8sIoApiV3), general.patch(CertificateSigningRequest));

router.delete(routes.map((e) => `${e}/:name`), validSchema(apiCertificatesK8sIoApiV3), general.deleteOne(CertificateSigningRequest));

router.delete(routes, validSchema(apiCertificatesK8sIoApiV3), general.delete(CertificateSigningRequest));

module.exports = router;
