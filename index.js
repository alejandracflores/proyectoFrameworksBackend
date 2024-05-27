//Dependencies
const morgan = require('morgan');
const express = require('express');
const app = express();

// Variables de entorno dentro del proyecto
require('dotenv').config();

//Routers
const user = require('./routes/user');
const publications = require('./routes/publications');
const paypal = require('./routes/paypal');
const webhooks = require('./routes/webhooks');

//Middleware
const auth = require('./middleware/auth');
const notFound = require('./middleware/notFound');
const index = require('./middleware/index');
const cors = require('./middleware/cors');

// Ruta estática
app.use(express.static('uploads'));

// Morgan
app.use(morgan('dev'));

// Cors
app.use(cors);

// Routes
app.use(express.json());
app.use(express.urlencoded({ extended: true }));


//app.use("/", index);
app.use("/user", user);
app.use("/publications", publications);
app.use("/paypal", paypal);
app.use('/webhooks', webhooks);

// milldeware
app.use(auth);

// Not found
app.use(notFound);

// Server
app.listen(process.env.PORT || 3000, () => {
    console.log("server is runing...")
});