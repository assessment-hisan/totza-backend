// utils/syncToGoogleSheet.js
import { google } from "googleapis";
import CompanyTransactions from "../models/CompanyTransaction.js";
import dotenv from "dotenv";
dotenv.config();

// Convert private key to correct format (replace \n with newlines)
const privateKey = process.env.PRIVATE_KEY?.replace(/\\n/g, '\n');

const auth = new google.auth.JWT({
  email: process.env.CLIENT_EMAIL,
  key: privateKey,
  scopes: ["https://www.googleapis.com/auth/spreadsheets"],
});

const SHEET_ID = process.env.SHEET_ID;
const SHEET_NAME = "Sheet1";

async function syncToGoogleSheet() {
  const client = await auth.authorize();
  const sheets = google.sheets({ version: "v4", auth });

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


}

export default syncToGoogleSheet;
