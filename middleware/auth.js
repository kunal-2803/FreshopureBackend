require('dotenv').config()
const jwt = require('jsonwebtoken');
const User = require('../models/user');
const cookieParser = require('cookie-parser');

const authMiddleware = async (req, res, next) => {

  const token = req.headers.token;

  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }

  try {
    const decoded = jwt.verify(token, process.env.TOKEN_KEY);
    let id = decoded.userId;
    const hotel = await User.findOne({ _id: id });
    req.hotel = hotel;

    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
};

module.exports = authMiddleware;