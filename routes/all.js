const router = require('express').Router();
const objects = require('../objects');
const { general } = require('../middleware');

router.delete('/all', (req, res, next) => {
  Promise.all(Object.keys(objects).map((obj) => {
    return general.delete(objects[obj], false)(req, res, next);
  }))
  .then(() => res.sendStatus(200))
  .catch(next);
});

module.exports = router;
