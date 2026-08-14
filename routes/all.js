const router = require('express').Router();
const objects = require('../objects');
const { general } = require('../middleware');

router.delete('/all', ...Object.values(objects).map((obj) => general.delete(obj, false)), (req, res, next) => {
  res.sendStatus(200)
});

module.exports = router;
