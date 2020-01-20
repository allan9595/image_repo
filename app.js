
// load modules
const express = require('express');
const cors = require('cors');
const db = require('./models/index');

//import routes 
const images = require('./routes/api/images');
const users = require('./routes/api/users');
const price = require('./routes/api/price');

//init app, setup ports, import models
const app = express();
const {Image, User} = db.sequelize;
const port = 5000 || process.env.PORT; 

// variable to enable global error logging
const enableGlobalErrorLogging = process.env.ENABLE_GLOBAL_ERROR_LOGGING === 'true';

app.use(cors());

// Setup request body JSON parsing.
app.use(express.json());

//init the db connection
db.sequelize
  .authenticate()
  .then(() => {
    console.log('Connection has been established successfully.');
  })
  .catch(err => {
    console.error('Unable to connect to the database:', err);
  });


app.get('/', (req, res) => 
    res.json({
        "message":"welcome to image repositors api!",
        "author":"bohandev",
        "version":"v1"
    })
);

app.listen(port, () => console.log(`Example app listening on port ${port}!`));