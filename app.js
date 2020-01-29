
// load modules
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const db = require('./models/index');
const bodyParser = require('body-parser');
const dotenv = require('dotenv');

//import routes 
const product = require('./routes/api/products');
const users = require('./routes/api/users');
const price = require('./routes/api/price');

//init app, setup ports, import models
const app = express();
const {Product, User} = db.sequelize;
const port = 5000 || process.env.PORT; 

// variable to enable global error logging
const enableGlobalErrorLogging = process.env.ENABLE_GLOBAL_ERROR_LOGGING === 'true';

dotenv.config();

app.use(helmet());
app.use(cors());

// parse application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({ extended: false }));

// parse application/json
app.use(bodyParser.json());

//use routes
app.use('/api/v1',product);
app.use('/api/v1',users);
app.use('/api/v1',price);

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