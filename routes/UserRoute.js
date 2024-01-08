const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const profileCompleteMiddleware = require('../middleware/profileComplete.js')
const usercontroller = require('../controllers/UserController');
const imageService = require('../services/imageService')

router.post("/login", usercontroller.login)
router.post("/verify", usercontroller.verifyotp)
router.post("/retry", usercontroller.retryotp)
router.post("/setprofile", authMiddleware, usercontroller.profile)
router.post('/upload', authMiddleware, imageService.upload.any(), usercontroller.uploadToS3AndSaveToDB);
router.get("/getprofile", authMiddleware, profileCompleteMiddleware, usercontroller.getProfile)


module.exports = router;