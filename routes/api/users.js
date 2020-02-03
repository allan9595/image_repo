//import necessary files and modules
const express = require('express');
const router = express.Router();
const User = require('../../models').User;
const multer  = require('multer')
const Sequelize = require('sequelize');
const bcrypt = require('bcryptjs');

module.exports = router;