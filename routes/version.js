const router = require('express').Router();

router.get('/version', (req, res) => {
  res.json({
    major: "1",
    minor: "0",
    gitVersion: "v1.0.0",
    gitCommit: "c725f2ce5164bf4165b22d6c28dd0ace4b3b7e9b",
    gitTreeState: "clean",
    buildDate: "2024-02-21T18:19:42Z",
    goVersion: "go1.20.12 X:strictfipsruntime",
    compiler: "gc",
    platform: "linux/amd64"
  })
});

module.exports = router;
