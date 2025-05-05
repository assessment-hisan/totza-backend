// utils/syncToGoogleSheet.js
import { google } from "googleapis";
import CompanyTransactions from "../models/CompanyTransaction.js";
import { getGoogleAuthClient } from "./googleAuth.js";
import dotenv from "dotenv";
import logger from "./logger.js"; // Consider adding a proper logger
dotenv.config();

// Constants
const SHEET_ID = process.env.SHEET_ID;
const SHEET_NAME = "Sheet1";
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000;

// Helper function for delay
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function syncToGoogleSheet() {
  // Date setup with proper timezone handling
  const now = new Date();
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);
  
  const todayEnd = new Date(now);
  todayEnd.setHours(23, 59, 59, 999);
  
  const dateString = now.toISOString().split('T')[0];
  const docTitle = `Transaction Report - ${dateString}`;

  // Validate environment variables
  if (!SHEET_ID) {
    throw new Error("SHEET_ID environment variable is not set");
  }

  let retryCount = 0;
  let lastError = null;

  while (retryCount < MAX_RETRIES) {
    try {
      // Get authenticated client with retry
      const auth = getGoogleAuthClient();
      const authClient = await auth.getClient();
      
      // Initialize Google Sheets API
      const sheets = google.sheets({
        version: "v4",
        auth: authClient
      });

      // Fetch transactions with error handling
      let transactions;
      try {
        transactions = await CompanyTransactions.find({
          createdAt: {
            $gte: todayStart,
            $lte: todayEnd
          }
        })
        .populate('account', 'name')
        .populate('addedBy', 'name') // Populate the account field with just the name
        .sort({ createdAt: 1 })
        .lean(); // Using lean() for better performance
      } catch (dbError) {
        logger.error("Database query failed:", dbError);
        throw new Error("Failed to fetch transactions from database");
      }
       
      // Prepare data with validation
      if (!Array.isArray(transactions)) {
        throw new Error("Transactions data is not in expected format");
      }
      
      const headers = [
        "Id", "Date", "Type", "Amount", "Account", "Vendor", 
        "Purpose", "Added By", "Created At"
      ];
      
      const rows = transactions.map(doc => {
        if (!doc._id || !doc.type || !doc.amount) {
          logger.warn("Incomplete transaction record:", doc);
        }
        return [
          doc._id?.toString() || "N/A",
          doc.date.toLocaleDateString('en-US', { weekday: 'long' }),
          doc.type || "N/A",
          doc.amount || 0,
          doc.account?.name || "N/A", // Access the populated account name
          doc.vendor || "N/A",
          doc.purpose || "N/A",
          doc.addedBy?.name  || "N/A",
          doc.createdAt ? new Date(doc.createdAt).toLocaleString() : "N/A"
        ];
      });

      // Clear existing data first (optional)
      try {
        await sheets.spreadsheets.values.clear({
          spreadsheetId: SHEET_ID,
          range: SHEET_NAME,
        });
      } catch (clearError) {
        logger.warn("Failed to clear sheet, proceeding with update:", clearError);
      }

      // Write data with headers
      await sheets.spreadsheets.values.update({
        spreadsheetId: SHEET_ID,
        range: SHEET_NAME,
        valueInputOption: "USER_ENTERED",
        requestBody: { 
          values: [headers, ...rows],
          majorDimension: "ROWS"
        },
      });

      logger.info(`Successfully synced ${rows.length} transactions to Google Sheets`);
      return { 
        success: true,
        count: rows.length,
        date: dateString
      };

    } catch (error) {
      lastError = error;
      retryCount++;
      
      logger.error(`Attempt ${retryCount} failed:`, {
        error: error.message,
        stack: error.stack,
        code: error.code
      });

      if (retryCount < MAX_RETRIES) {
        logger.info(`Retrying in ${RETRY_DELAY_MS}ms...`);
        await delay(RETRY_DELAY_MS);
      }
    }
  }

  // If we get here, all retries failed
  const errorMessage = `Failed to sync after ${MAX_RETRIES} attempts. Last error: ${lastError.message}`;
  logger.error(errorMessage);
  throw new Error(errorMessage);
}

export default syncToGoogleSheet;