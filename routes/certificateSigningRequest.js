const router = require('express').Router();
const { CertificateSigningRequest } = require('../objects');
const { general, openapi } = require('../middleware');

const { apiCertificatesK8sIoApiV3, apiV1OpenApiV3, validSchema } = openapi;

let routes = [`/apis/${CertificateSigningRequest.apiVersion}/certificatesigningrequests`];

router.get(routes.map((e) => `${e}/:name`), validSchema(apiCertificatesK8sIoApiV3), general.findOne(CertificateSigningRequest), general.format(CertificateSigningRequest), general.raw(CertificateSigningRequest));

router.get(['/api/v1/certificatesigningrequests', ...routes], validSchema(apiV1OpenApiV3), general.find(CertificateSigningRequest), general.format(CertificateSigningRequest), general.list(CertificateSigningRequest));

router.post(routes, validSchema(apiCertificatesK8sIoApiV3), general.save(CertificateSigningRequest), general.sendObj(CertificateSigningRequest));

router.put(routes, validSchema(apiCertificatesK8sIoApiV3), general.update(CertificateSigningRequest), general.sendObj(CertificateSigningRequest));

router.patch(routes.map((e) => `${e}/:name`), validSchema(apiCertificatesK8sIoApiV3), general.patch(CertificateSigningRequest), general.sendObj(CertificateSigningRequest));

router.delete(routes.map((e) => `${e}/:name`), validSchema(apiCertificatesK8sIoApiV3), general.deleteOne(CertificateSigningRequest), general.sendObj(CertificateSigningRequest));

router.delete(routes, validSchema(apiCertificatesK8sIoApiV3), general.delete(CertificateSigningRequest), general.sendObj(CertificateSigningRequest));

module.exports = router;
