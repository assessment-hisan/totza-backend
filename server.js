import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import mongoose from 'mongoose';
import authRoutes from "./src/routes/auth.js"
import personal from "./src/routes/personalTransactionRoutes.js"
import company from "./src/routes/companyTransactionRoutes.js"
import accountCategory from "./src/routes/small/accountCategoryRoutes.js"
import item from './src/routes/small/itemRoutes.js'
import Vendor from './src/routes/small/vendorRoutes.js'
dotenv.config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/personal', personal )
app.use('/company', company)
app.use('/account', accountCategory)
app.use('/vendor', Vendor)
app.use('/item', item)
// app.use("/vendor")
// Root Route
app.get('/', (req, res) => {
  res.send('Totza Backend is running...');
});

// Connect to MongoDB and Start Server
const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI;

mongoose.connect(MONGO_URI)
  .then(() => {
    console.log('MongoDB connected');
    app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
  })
  .catch((err) => {
    console.error('Database connection failed', err.message);
    process.exit(1);
  });
