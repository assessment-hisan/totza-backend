import express from 'express';
import { registerUser, loginUser, googleAuth, getUser, getAllUsers, changePassword } from '../controllers/authController.js';
import { authMiddleware } from '../middlewares/authMiddleware.js';
const router = express.Router();

// User registration
router.post('/register', registerUser);

// User login with email and password
router.post('/login', loginUser);

// Google login
router.post('/google-login', googleAuth);

router.get("/get-user",authMiddleware, getUser)

router.get("/get-all-users", authMiddleware, getAllUsers)

router.post("/change-password", authMiddleware, changePassword)

export default router;
