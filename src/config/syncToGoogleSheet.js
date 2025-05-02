// utils/syncToGoogleSheet.js
import { google } from "googleapis";
import CompanyTransactions from "../models/CompanyTransaction.js";
import { getGoogleAuthClient } from "./googleAuth.js";
import dotenv from "dotenv";
dotenv.config();

async function syncToGoogleSheet() {
  try {
    console.log("Starting Google Sheets sync process...");
    
    // Get the authenticated client using our JSON file approach
    const auth = getGoogleAuthClient();
    
    // Get authenticated client
    console.log("Getting authenticated client...");
    const authClient = await auth.getClient();
    console.log("Auth client obtained successfully");
    
    // Initialize Google Sheets API
    const sheets = google.sheets({
      version: "v4",
      auth: authClient
    });
    
    const SHEET_ID = process.env.SHEET_ID;
    const SHEET_NAME = "Sheet1";

    // Fetch all transactions
    console.log("Fetching transactions...");
    const transactions = await CompanyTransactions.find();
    console.log(`Found ${transactions.length} transactions to sync`);

    const rows = [
      ["Type", "Amount", "Account", "Vendor", "Purpose", "Added By", "Created At"],
      ...transactions.map((doc) => [
        doc.type,
        doc.amount,
        doc.account,
        doc.vendor || "",
        doc.purpose,
        doc.addedBy.toString(),
        new Date(doc.createdAt).toLocaleString(),
      ]),
    ];

    // Clear existing data
    console.log("Clearing existing spreadsheet data...");
    await sheets.spreadsheets.values.clear({
      spreadsheetId: SHEET_ID,
      range: SHEET_NAME,
    });

    // Write new data
    console.log("Writing new data to spreadsheet...");
    await sheets.spreadsheets.values.update({
      spreadsheetId: SHEET_ID,
      range: SHEET_NAME,
      valueInputOption: "USER_ENTERED",
      requestBody: { values: rows },
    });

    console.log("Google Sheets sync completed successfully");
    return { success: true };
    
  } catch (error) {
    console.error("Error in syncToGoogleSheet:", error);
    
    // Enhanced error logging
    console.error("Error details:", {
      message: error.message,
      code: error.code,
      stack: error.stack
    });
    
    if (error.code === "ERR_OSSL_UNSUPPORTED") {
      console.error("OpenSSL error detected - check your Google JSON key file format");
    }
    
    throw error;
  }
}

export default syncToGoogleSheet;