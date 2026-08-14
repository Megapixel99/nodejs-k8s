const { DateTime } = require('luxon');
const router = require('express').Router();

let bDate = DateTime.now().toUTC().toISO().replace(/\.\d{0,3}/, "");

router.get('/version', (req, res) => {
  res.json({
    major: "1",
    minor: "0",
    gitVersion: "v1.0.0",
    gitCommit: "c725f2ce5164bf4165b22d6c28dd0ace4b3b7e9b",
    gitTreeState: "clean",
    buildDate: bDate,
    goVersion: null,
    compiler: null,
    platform: "linux/amd64"
  })
});

module.exports = router;
