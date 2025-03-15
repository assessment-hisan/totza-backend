import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import mongoose from 'mongoose';
import authRoutes from "./src/routes/auth.js"
import projectRoutes from './src/routes/projects.js';
import expenseRoutes from './src/routes/expenses.js';
import projectExpenses from "./src/routes/projectExpenses.js"

dotenv.config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/expenses', expenseRoutes);
app.use("/api/project-expenses", projectExpenses)
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
