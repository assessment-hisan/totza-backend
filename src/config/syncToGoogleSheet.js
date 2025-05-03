// utils/syncToGoogleSheet.js
import { google } from "googleapis";
import CompanyTransactions from "../models/CompanyTransaction.js";
import { getGoogleAuthClient } from "./googleAuth.js";
import dotenv from "dotenv";
dotenv.config();

async function syncToGoogleSheet() {
  try {
    
    
    // Get the authenticated client using our JSON file approach
    const auth = getGoogleAuthClient();
    
    // Get authenticated client
    
    const authClient = await auth.getClient();
    
    
    // Initialize Google Sheets API
    const sheets = google.sheets({
      version: "v4",
      auth: authClient
    });
    
    const SHEET_ID = process.env.SHEET_ID;
    const SHEET_NAME = "Sheet1";

    // Fetch all transactions
    
    const transactions = await CompanyTransactions.find();
    

    const rows = [
      ["Id","Type", "Amount", "Account", "Vendor", "Purpose", "Added By", "Created At"],
      ...transactions.map((doc) => [
        doc._id,
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
    
    await sheets.spreadsheets.values.clear({
      spreadsheetId: SHEET_ID,
      range: SHEET_NAME,
    });

    // Write new data
    
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
