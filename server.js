import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import mongoose from 'mongoose';
import authRoutes from "./src/routes/auth.js";
import personal from "./src/routes/personalTransactionRoutes.js";
import company from "./src/routes/companyTransactionRoutes.js";
import due from "./src/routes/dueTransactions.js"
import accountCategory from "./src/routes/small/accountCategoryRoutes.js";
import item from './src/routes/small/itemRoutes.js';
import Vendor from './src/routes/small/vendorRoutes.js';
import projects from "./src/routes/small/projectRoutes.js"
import worker from "./src/routes/small/workerRoutes.js"
import vendor from "./src/routes/small/vendorRoutes.js"
import cron from "node-cron";
import syncToGoogleSheet from "./src/config/syncToGoogleSheet.js";
import generateDailyReport from './src/config/generateDailyReport.js';

dotenv.config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/personal', personal);
app.use('/company', company);
app.use('/due', due);
app.use('/account', accountCategory);
app.use('/vendor', Vendor);
app.use('/item', item);
app.use('/project', projects);
app.use('/worker', worker);
app.use('/vendor', vendor)

// Root Route
app.get('/', (req, res) => {
  res.send('Totza Backend is running...');
});

// Scheduled Tasks
function setupScheduledJobs() {
  // Sync to Google Sheets at 11:45 PM daily
  cron.schedule('45 23 * * *', async () => {
    console.log('⏰ Running nightly Google Sheets sync...');
    try {
      const result = await syncToGoogleSheet();
      console.log('✅ Google Sheets sync completed:', result);
    } catch (error) {
      console.error('❌ Google Sheets sync failed:', error.message);
    }
  });

  // Generate daily report at 11:45 PM daily (runs after sync)
  // cron.schedule('45 23 * * *', async () => {
  //   console.log('📄 Generating daily report...');
  //   try {
  //     const result = await generateDailyReport();
  //     console.log('📝 Daily report created:', result.docUrl);
  //   } catch (error) {
  //     console.error('❌ Daily report generation failed:', error.message);
  //   }
  // }, {
  //   scheduled: true,
  //   timezone: "Asia/Kolkata" // Adjust to your timezone
  // });
}


app.post('/api/trigger-sync', async (req, res) => {
  try {
    const result = await syncToGoogleSheet();
    res.json({ success: true, message: 'Sync completed', result });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.post('/api/trigger-report', async (req, res) => {
  try {
    const result = await generateDailyReport();
    res.json({ success: true, reportUrl: result.docUrl });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Connect to MongoDB and Start Server
const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI;

mongoose.connect(MONGO_URI)
  .then(() => {
    console.log('MongoDB connected');
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
      setupScheduledJobs(); // Initialize scheduled tasks
    });
  })
  .catch((err) => {
    console.error('Database connection failed', err.message);
    process.exit(1);
  });
