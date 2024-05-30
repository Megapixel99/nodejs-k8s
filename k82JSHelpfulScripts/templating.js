let r = [
[ 'APIService', 'apiService' ],
[ 'Binding', 'binding' ],
[ 'ComponentStatus', 'componentStatus' ],
[ 'ControllerRevision', 'controllerRevision' ],
[ 'CronJob', 'cronJob' ],
[ 'CSIDriver', 'csidriver' ],
[ 'CSINode', 'csiNode' ],
[ 'CSIStorageCapacity', 'csiStorageCapacity' ],
[ 'EndpointSlice', 'endpointSlice' ],
[ 'HorizontalPodAutoscaler', 'horizontalPodAutoscaler' ],
[ 'HorizontalPodAutoscaler', 'horizontalPodAutoscaler' ],
[ 'IngressClass', 'ingressClass' ],
[ 'Job', 'job' ],
[ 'Lease', 'lease' ],
[ 'LimitRange', 'limitRange' ],
[ 'LocalSubjectAccessReview', 'localSubjectAccessReview' ],
[ 'MutatingWebhookConfiguration', 'mutatingWebhookConfiguration' ],
[ 'NetworkPolicy', 'networkPolicy' ],
[ 'PersistentVolume', 'persistentVolume' ],
[ 'PersistentVolumeClaim', 'persistentVolumeClaim' ],
[ 'PodDisruptionBudget', 'podDisruptionBudget' ],
[ 'PodTemplate', 'podTemplate' ],
[ 'PriorityClass', 'priorityClass' ],
[ 'ResourceQuota', 'resourceQuota' ],
[ 'RuntimeClass', 'runtimeClass' ],
[ 'SelfSubjectAccessReview', 'selfSubjectAccessReview' ],
[ 'SelfSubjectRulesReview', 'selfSubjectRulesReview' ],
[ 'StatefulSet', 'statefulSet' ],
[ 'StorageClass', 'storageClass' ],
[ 'SubjectAccessReview', 'subjectAccessReview' ],
[ 'TokenReview', 'tokenReview' ],
[ 'ValidatingWebhookConfiguration', 'validatingWebhookConfiguration' ],
[ 'VolumeAttachment', 'volumeAttachment' ]
]

// const models = require('./database/models.js');
const fs = require('fs');

// console.log(models);

// for (let res of r) {
//   let plural = `${res[1]}s`
//   if (res[1].split('').at(-1) === 's') {
//     plural = `${res[1]}es`
//   }
//   let str = `const router = require('express').Router();
// const { ${res[0]} } = require('../objects');
// const { general, openapi } = require('../middleware');
//
// const { apiAppsV1OpenApiV3, apiV1OpenApiV3, validSchema } = openapi;
//
// const routes = [\`/api/\$\{${res[0]}.apiVersion}/:namespace/\$\{plural.toLowerCase()}\`];
//
// router.get(routes.map((e) => \`\${e}/:name\`), validSchema(apiAppsV1OpenApiV3), general.findOne(${res[0]}), general.format(${res[0]}), general.raw(${res[0]}));
//
// router.get(['/api/v1/${plural.toLowerCase()}', ...routes], validSchema(apiV1OpenApiV3), general.find(${res[0]}), general.format(${res[0]}), general.list(${res[0]}));
//
// router.post(routes, validSchema(apiAppsV1OpenApiV3), general.save(${res[0]}));
//
// router.put(routes, validSchema(apiAppsV1OpenApiV3), general.update(${res[0]}));
//
// router.patch(routes.map((e) => \`\${e}/:name\`), validSchema(apiAppsV1OpenApiV3), general.patch(${res[0]}));
//
// router.delete(routes.map((e) => \`\${e}/:name\`), validSchema(apiAppsV1OpenApiV3), general.deleteOne(${res[0]}));
//
// router.delete(routes, validSchema(apiAppsV1OpenApiV3), general.delete(${res[0]}));
//
// module.exports = router;`
//   fs.writeFileSync(`./routes/${res[1]}.js`, str)
// }

for (let res of r) {
  let plural = `${res[1]}s`
  if (res[1].split('').at(-1) === 's') {
    plural = `${res[1]}es`
  }
  let str = `${res[1]}: require('./${res[1]}.js'),`
  console.log(str);
}
