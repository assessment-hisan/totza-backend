import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from "../models/User.js"
import AccountCategory from '../models/AccountCategory.js';
// Register User
export const registerUser = async (req, res) => {
    const { name, email, password } = req.body;
  
    try {
      const existingUser = await User.findOne({ email });
      if (existingUser) return res.status(400).json({ message: "User already exists" });
  
      const hashedPassword = await bcrypt.hash(password, 12);
      const newUser = await User.create({ name, email, password: hashedPassword });
  
      // ✅ Create associated AccountCategory with same name
      const accountCategory = new AccountCategory({
        name,
        createdBy: newUser._id,
        linkedUser: newUser._id
      });
      await accountCategory.save();
  
      const token = jwt.sign(
        { id: newUser._id, email: newUser.email },
        process.env.JWT_SECRET,
        { expiresIn: '10h' }
      );
  
      res.status(201).json({ result: newUser, token });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Something went wrong" });
    }
  };

// Login User
export const loginUser = async (req, res) => {
    const { email, password } = req.body;

    try {
        const existingUser = await User.findOne({ email });
        if (!existingUser) return res.status(404).json({ message: "User not found" });

        const isPasswordCorrect = await bcrypt.compare(password, existingUser.password);
        if (!isPasswordCorrect) return res.status(400).json({ message: "Invalid credentials" });

        const token = jwt.sign({ id: existingUser._id, email: existingUser.email }, process.env.JWT_SECRET, { expiresIn: '10h' });

        res.status(200).json({ result: existingUser, token });
    } catch (err) {
        res.status(500).json({ message: "Something went wrong" });
    }
};

// Google Auth
export const googleAuth = async (req, res) => {
    const { name, email } = req.body;

    try {
        let user = await User.findOne({ email });

        if (!user) {
            user = await User.create({ name, email });
        }

        const token = jwt.sign({ id: user._id, email: user.email }, process.env.JWT_SECRET, { expiresIn: '1h' });

        res.status(200).json({ result: user, token });
    } catch (err) {
        res.status(500).json({ message: "Something went wrong" });
    }
};

export const getUser = async (req, res) => {

    const isUser = await User.findOne({ _id: req.user._id })

    if (!isUser) {
        return res.sendStatus(401)
    }
    return res.json({
        user: {
            fullName: isUser.name,
            email: isUser.email,
            createdOn: isUser.createOn,
            userId : req.user._id
        },
        message: "validated"
    })
}

export const getAllUsers = async (req, res) => {
    try {
        const users = await User.find({ _id: { $ne: req.user._id } }, { password: 0 }); // Exclude password
        res.status(200).json({ success: true, users });
    } catch (error) {
        console.error("Error fetching users:", error.message);
        res.status(500).json({ success: false, message: "Server error" });
    }
};

export const changePassword = async (req, res) => {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user.id;

    try {
        const user = await User.findById(userId);

        if (!user) return res.status(404).json({ message: "User not found" });

        // Check current password
        const isMatch = await bcrypt.compare(currentPassword, user.password);
        if (!isMatch) return res.status(400).json({ message: "Current password is incorrect" });

        // Hash the new password
        const hashedPassword = await bcrypt.hash(newPassword, 12);

        // Update password
        user.password = hashedPassword;
        await user.save();

        res.status(200).json({ message: "Password changed successfully" });
    } catch (error) {
        res.status(500).json({ message: "Error changing password" });
    }
};
