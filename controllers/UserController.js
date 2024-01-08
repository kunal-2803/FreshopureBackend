require('dotenv').config()
const jwt = require('jsonwebtoken');
const msg91 = require('msg91').default;
const AWS = require('aws-sdk');
const fs = require('fs')

const User = require('../models/user.js');
const HotelAddressMongo = require('../models/HotelAddress.js');
const HotelProfileMongo = require('../models/HotelProfile.js');
const HotelImageMongo = require('../models/HotelImage.js');

const assignDefaultItem = require('../utils/defaultItemAssign.js')

const ErrorHandler = require("../utils/errorHandler.js");
const catchAsyncError = require("../middleware/catchAsyncError.js");

const { getDatabase } = require('../dbClient.js');
const { ObjectId } = require('mongodb');
const db = getDatabase();

const HotelProfile = db.collection('hotelprofiles');
const HotelProfileImage = db.collection('hotelimages');


////Functions//
function generateToken(user) {
  const token = jwt.sign({ userId: user._id }, process.env.TOKEN_KEY);
  return token;
}

/////////

const login = catchAsyncError(async (req, res, next) => {
  try {
    const { mobile } = req.body;
    if (mobile.length == 12) {
      let otp = msg91.getOTP(process.env.TEMPLATEID);
      // Send OTP
      await otp.send(mobile).then(() => console.log("success")).catch(err => console.log(err))
      res.status(200).json({ message: 'OTP Sent successfully' });
    } else {
      res.status(400).json({ error: 'Enter Valid Number' });
    }
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

const retryotp = catchAsyncError(async (req, res, next) => {
  try {
    const { mobile } = req.body;
    if (mobile.length == 12) {
      let otp = msg91.getOTP(process.env.TEMPLATEID);
      // Send OTP
      await otp.retry(mobile).then(() => console.log("success")).catch(err => console.log(err))

      res.status(200).json({ message: 'OTP Sent successfully' });
    } else {
      res.status(400).json({ error: 'Enter Valid Number' });
    }

  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

const verifyotp = catchAsyncError(async (req, res, next) => {
  try {
    const { mobile, otpRec } = req.body;
    let otp = msg91.getOTP(process.env.TEMPLATEID);

    const user = await User.findOne({ mobile });
    let token = "";

    await otp.verify(mobile, otpRec).then(async () => {
      console.log("Success");
      if (!user) {
        const user = new User({
          mobile
        });
        // Save the user to the database
        await user.save();
      }
      const getUser = await User.findOne({ mobile });
      let tkn = generateToken(getUser);
      token = tkn;

    })
    const userData = await User.findOne({ mobile });
    res.json({ token, profileComplete: userData?.isProfieComplete ,isProfileReviewed: userData?.isProfileReviewed,reviewStatus: userData?.reviewStatus });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
})
const profile = catchAsyncError(async (req, res, next) => {
  try {
    const HotelId = req.hotel._id
    const { fullName, hotelName, email, addressLine1, addressLine2, state, city, pinCode, update } = req.body;
    if (update) {
      await HotelProfileMongo.updateOne({ HotelId: new ObjectId(HotelId) }, { $set: { fullName: fullName, hotelName: hotelName, email: email } })
      res.status(200).json({ message: 'Hotel Profile Updated' });
    }
    else {
      const profile = new HotelProfileMongo({
        HotelId,
        hotelName,
        fullName,
        email
      });
      await profile.save();

      await HotelAddressMongo.updateMany({ HotelId: new ObjectId(HotelId), selected: true }, { $set: { selected: false } });

      const address = new HotelAddressMongo({
        HotelId,
        hotelName,
        addressLine1,
        addressLine2,
        state,
        city,
        pinCode
      })
      await address.save();
      await assignDefaultItem.assignDefaultItems(HotelId);
      await User.updateOne({ _id: new ObjectId(HotelId) }, { $set: { isProfieComplete: true } })
      res.status(200).json({ message: 'Hotel Profile Updated' });
    }
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
})

const uploadToS3AndSaveToDB = catchAsyncError(async (req, res, next) => {
  try {
    const HotelId = req.hotel._id
    const filePath = req.files[0].path;
    const fileName = req.files[0].filename
    const { update } = req.body;

    const bucketName = process.env.AWS_USER_IMAGE_BUCKET_NAME
    const region = process.env.AWS_BUCKET_REGION
    const accessKeyId = process.env.AWS_ACCESS_KEY
    const secretAccessKey = process.env.AWS_SECRET_KET

    AWS.config.update({
      accessKeyId,
      secretAccessKey,
      region
    });

    const s3 = new AWS.S3();

    const uploadParams = {
      Bucket: bucketName,
      Key: fileName,
      Body: fs.createReadStream(filePath)
    };



    const s3UploadResponse = await s3.upload(uploadParams).promise();

    // Now you can save the S3 file URL and other details to your database
    const s3FileUrl = s3UploadResponse.Location;

    const hotelImage = s3FileUrl;
    const present = await HotelImageMongo.findOne({ HotelId: new ObjectId(HotelId) });
    if (update && present) {
      await HotelImageMongo.updateOne({ HotelId: new ObjectId(HotelId) }, { $set: { hotelImage: hotelImage } })
    } else {
      const profileImage = new HotelImageMongo({
        HotelId,
        hotelImage
      });
      await profileImage.save();
    }
    // Remove the temporary file from the server
    fs.unlinkSync(filePath);

    // Respond to the client
    res.status(200).json({ message: 'File uploaded and saved successfully' });
  } catch (error) {
    res.status(200).json({ error: 'Internal server error' });
  }
})

const getProfile = catchAsyncError(async (req, res, next) => {
  try {
    const HotelId = req.hotel._id
    const loggedInUser = await User.findOne({ _id: HotelId });

    const hotelProfile = await HotelProfile.find({ HotelId: new ObjectId(HotelId) }).toArray();
    const hotelProfileImage = await HotelProfileImage.find({ HotelId: new ObjectId(HotelId) }).toArray();
    if (loggedInUser.isProfieComplete) {
      const hotelData = { ...hotelProfile[0], image: hotelProfileImage[0]?.hotelImage, ...loggedInUser._doc }
      res.status(200).json({ hotelData });
    } else {
      const hotelData = { ...loggedInUser._doc }
      res.status(200).json({ hotelData });
    }

  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
})

module.exports = { login, retryotp, verifyotp, profile, uploadToS3AndSaveToDB, getProfile }
