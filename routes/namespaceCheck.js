const router = require('express').Router();
const { Namespace } = require('../objects');

router.use('/api/v1/namespaces/:namespace', (req, res, next) => {
  Namespace.findOne({ 'metadata.name': req.params.namespace })
  .then((mamespace) => {
    if (mamespace) {
      return next();
    }
    res.status(403).send(Namespace.forbiddenStatus(req.params.namespace));
  })
  .catch(next);
});

module.exports = router;
