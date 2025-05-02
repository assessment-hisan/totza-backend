import { google } from "googleapis";
import CompanyTransactions from "../models/CompanyTransaction.js";
import dotenv from "dotenv";
dotenv.config();

async function syncToGoogleSheet() {
  try {
    // Handle private key with more robust formatting
    let privateKey = process.env.PRIVATE_KEY;
    
    // Check if the key is properly formatted with BEGIN and END markers
    if (!privateKey.includes("-----BEGIN PRIVATE KEY-----")) {
      // Try to fix the format if it's not properly formatted
      privateKey = privateKey.replace(/\\n/g, '\n');
      
      // If it still doesn't have proper markers, it might be base64 encoded
      if (!privateKey.includes("-----BEGIN PRIVATE KEY-----")) {
        console.error("Private key appears to be in an incorrect format");
        throw new Error("Invalid private key format");
      }
    }

    // Create auth client
    const auth = new google.auth.JWT({
      email: process.env.CLIENT_EMAIL,
      key: privateKey,
      scopes: ["https://www.googleapis.com/auth/spreadsheets"],
    });

    // Validate the auth setup before proceeding
    const client = await auth.authorize();
    console.log("Authentication successful");
    
    const sheets = google.sheets({ version: "v4", auth });
    const SHEET_ID = process.env.SHEET_ID;
    const SHEET_NAME = "Sheet1";

    // Fetch all transactions
    const transactions = await CompanyTransactions.find();

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

    console.log("Spreadsheet successfully updated");
    return { success: true };
    
  } catch (error) {
    console.error("Error in syncToGoogleSheet:", error);
    
    // Provide more detailed error information for debugging
    if (error.code === "ERR_OSSL_UNSUPPORTED") {
      console.error("This appears to be an issue with the private key format.");
      console.error("Make sure your private key is properly formatted with correct line breaks.");
    }
    
    throw error;
  }
}

export default syncToGoogleSheet;