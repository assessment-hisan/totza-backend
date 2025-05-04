// controllers/reportController.js
import cron from 'node-cron';
import generateDailyReport from '../config/generateDailyReport';

// Run daily at 11:30 PM
cron.schedule('30 23 * * *', async () => {
  console.log('Running daily report generation...');
  try {
    const result = await generateDailyReport();
    console.log('Report generated:', result.docUrl);
  } catch (error) {
    console.error('Failed to generate report:', error);
  }
});