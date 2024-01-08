require('dotenv').config()
const express = require('express');
const bodyParser = require('body-parser');
const msg91 = require('msg91').default;
const cookieParser = require('cookie-parser');


const userRoute = require('./routes/UserRoute');
const orderRoute = require('./routes/OrderRoute');
const itemsRoute = require('./routes/ItemsRoute');
const cartRoute = require('./routes/CartRoute');
const wishlistRoute = require('./routes/WishlistRoute');
const addressRoute = require('./routes/AddressRoute');

const errorMiddleware = require('./middleware/error');


require("./db");

const app = express();
app.use(cookieParser());
app.use(errorMiddleware);

msg91.initialize({ authKey: process.env.AUTHKEY });
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

app.use('/user', userRoute);
app.use('/order', orderRoute);
app.use('/items', itemsRoute);
app.use('/cart', cartRoute);
app.use('/wishlist', wishlistRoute);
app.use('/address', addressRoute);

const port = process.env.PORT;
app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});






