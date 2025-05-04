import { google } from "googleapis";
import CompanyTransaction from "../models/CompanyTransaction.js";
import { getGoogleAuthClient } from "./googleAuth.js";
import dotenv from "dotenv";
dotenv.config();

async function generateDailyReport() {
  try {
    const auth = getGoogleAuthClient();
    const authClient = await auth.getClient();

    const drive = google.drive({ version: "v3", auth: authClient });
    const docs = google.docs({ version: "v1", auth: authClient });

    // Date setup
    const today = new Date();
    const todayStart = new Date(today.setHours(0, 0, 0, 0));
    const todayEnd = new Date(today.setHours(23, 59, 59, 999));
    const dateString = today.toISOString().split('T')[0];
    const docTitle = `Transaction Report - ${dateString}`;

    const TARGET_FOLDER_ID = process.env.GOOGLE_REPORTS_FOLDER_ID;
    if (!TARGET_FOLDER_ID) throw new Error("GOOGLE_REPORTS_FOLDER_ID is not set");

    const transactions = await CompanyTransaction.find({
      createdAt: { $gte: todayStart, $lte: todayEnd }
    }).sort({ createdAt: 1 });

    if (transactions.length === 0) {
      console.log("No transactions found for today");
      return {
        success: true,
        message: "No transactions to report today",
        docCreated: false
      };
    }

    const stats = {
      totalAmount: transactions.reduce((sum, t) => sum + t.amount, 0),
      typeCounts: transactions.reduce((counts, t) => {
        counts[t.type] = (counts[t.type] || 0) + 1;
        return counts;
      }, {})
    };

    const doc = await docs.documents.create({
      requestBody: { title: docTitle }
    });

    const documentId = doc.data.documentId;
    console.log(`Document created with ID: ${documentId}`);

    await drive.files.update({
      fileId: documentId,
      addParents: TARGET_FOLDER_ID,
      fields: 'id, parents'
    });

    const headerContent = [
      `DAILY TRANSACTION REPORT - ${dateString}`,
      `Generated: ${new Date().toLocaleString()}`,
      ``,
      `SUMMARY:`,
      `Total Transactions: ${transactions.length}`,
      `Total Amount: $${stats.totalAmount.toFixed(2)}`,
      `Transaction Counts by Type:`,
      ...Object.entries(stats.typeCounts).map(([type, count]) => `- ${type}: ${count}`),
      ``,
      `DETAILED TRANSACTIONS:`
    ].join('\n');

    const tableHeaders = ["Date", "Type", "Amount", "Account", "Vendor", "Items", "Purpose"];
    const rows = [
      tableHeaders,
      ...transactions.map(t => [
        new Date(t.createdAt).toLocaleDateString(),
        t.type.toUpperCase(),
        `$${t.amount.toFixed(2)}`,
        t.account,
        t.vendor || "N/A",
        t.items ? t.items.join(", ") : "N/A",
        t.purpose
      ])
    ];

    const requests = [];

    // Insert header text
    requests.push({
      insertText: {
        text: headerContent + "\n\n",
        location: { index: 1 }
      }
    });

    // Create table
    requests.push({
      insertTable: {
        rows: rows.length,
        columns: tableHeaders.length,
        location: { index: headerContent.length + 2 }
      }
    });

    // Flatten rows into insertText requests for each cell
    let currentIndex = headerContent.length + 3;
    for (let rowIndex = 0; rowIndex < rows.length; rowIndex++) {
      for (let colIndex = 0; colIndex < rows[rowIndex].length; colIndex++) {
        const text = rows[rowIndex][colIndex] + '\n';
        requests.push({
          insertText: {
            text,
            location: { index: currentIndex }
          }
        });
        currentIndex += text.length;
      }
    }

    await docs.documents.batchUpdate({
      documentId,
      requestBody: { requests }
    });

    return {
      success: true,
      message: "Daily report created successfully",
      docCreated: true,
      documentId
    };
  } catch (error) {
    console.error("Error in generateDailyReport:", error);
    return {
      success: false,
      message: "Failed to generate daily report",
      error: error.message
    };
  }
}

export default generateDailyReport;
