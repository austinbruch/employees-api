'use strict';

const express = require('express');
const router = express.Router();

const DATABASE = {};

/* GET employees listing. */
router.get('', function(req, res) {
  return res.send(DATABASE);
});

module.exports = router;
