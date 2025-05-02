// utils/syncToGoogleSheet.js
import { google }  from "googleapis"
import CompanyTransactions from "../models/CompanyTransaction"
const auth = new google.auth.GoogleAuth({
  keyFile: "credentials.json",
  scopes: ["https://www.googleapis.com/auth/spreadsheets"],
});

const SHEET_ID = process.env.SHEET_ID;
const SHEET_NAME = "Sheet1";

async function syncToGoogleSheet() {
  const client = await auth.getClient();
  const sheets = google.sheets({ version: "v4", auth: client });

  // Fetch all transactions
  const transactions = await CompanyTransactions.find();

  // Build rows: first row is headers, rest are data
  const rows = [
    [
      "Type",
      "Amount",
      "Account",
      "Vendor",
      "Purpose",
      "Added By",
      "Created At",
    ],
    ...transactions.map((doc) => [
      doc.type,
      doc.amount,
      doc.account.toString(),
      doc.vendor || "",
      doc.purpose,
      doc.addedBy.toString(),
      new Date(doc.createdAt).toLocaleString(),
    ]),
  ];

  // Clear previous data
  await sheets.spreadsheets.values.clear({
    spreadsheetId: SHEET_ID,
    range: SHEET_NAME,
  });

  // Write new data
  await sheets.spreadsheets.values.update({
    spreadsheetId: SHEET_ID,
    range: SHEET_NAME,
    valueInputOption: "USER_ENTERED",
    requestBody: {
      values: rows,
    },
  });

  console.log("✅ Google Sheet synced successfully");
}


export default syncToGoogleSheet;
