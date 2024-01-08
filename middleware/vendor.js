require('dotenv').config()
const User = require('../models/user');
const cookieParser = require('cookie-parser');

const profileCompleteMiddleware = async (req, res, next) => {

    try {
        const id = req.hotel._id
        const hotel = await User.findOne({ _id: id });
        if(!hotel){
            res.status(404).json({error:"Hotel Not Found"})
        }
        if (hotel.isProfieComplete == true) {
            if(hotel.isProfileReviewed == true && hotel.reviewStatus=='Approved'){
            next();
            }else{
                res.status(406).json({profileComplete:false,isProfileReviewed:hotel.isProfileReviewed,reviewStatus:hotel.reviewStatus, error: 'Profile Not Reviewed' });
            }
        } else {
            res.status(406).json({profileComplete:false, error: 'Profile Not Completed' });
        }

    } catch (error) {
        res.status(500).json({ error });
    }
};

module.exports = profileCompleteMiddleware;