import { google } from "googleapis";
import CompanyTransactions from "../models/CompanyTransaction.js";
import { getGoogleAuthClient } from "./googleAuth.js";
import dotenv from "dotenv";
import logger from "./logger.js";

dotenv.config();

export async function generateDailyReport() {
  const now = new Date();
  const todayStart = new Date(now.setHours(0, 0, 0, 0));
  const todayEnd = new Date(now.setHours(23, 59, 59, 999));
  const dateString = new Date().toISOString().split("T")[0];
  const docTitle = `Transaction Report - ${dateString}`;

  try {
    const auth = getGoogleAuthClient();
    const authClient = await auth.getClient();

    const docs = google.docs({ version: "v1", auth: authClient });

    // Fetch transactions for today
    const transactions = await CompanyTransactions.find({
      createdAt: { $gte: todayStart, $lte: todayEnd },
    })
      .sort({ createdAt: 1 })
      .lean();

    if (!transactions.length) {
      logger.warn("No transactions found for today.");
      return { success: false, message: "No transactions to sync" };
    }

    // Create the document
    const createResponse = await docs.documents.create({
      requestBody: {
        title: docTitle,
      },
    });

    const documentId = createResponse.data.documentId;

    const headers = [
      "Date",
      "Type",
      "Amount",
      "Account",
      "Vendor",
      "Purpose",
      "Added By",
      "Time",
    ];

    const tableRows = [
      {
        tableCells: headers.map((text) => ({
          content: text,
          bold: true,
        })),
      },
      ...transactions.map((txn) => ({
        tableCells: [
          new Date(txn.date).toLocaleDateString(),
          txn.type || "N/A",
          txn.amount || 0,
          txn.account || "N/A",
          txn.vendor || "N/A",
          txn.purpose || "N/A",
          txn.addedBy?.toString() || "N/A",
          txn.createdAt ? new Date(txn.createdAt).toLocaleTimeString() : "N/A",
        ].map((text) => ({ content: text })),
      })),
    ];

    const requests = [
      {
        insertText: {
          location: { index: 0 },
          text: `${docTitle}`
        }
      },
      {
        insertTable: {
          rows: tableRows.length,
          columns: headers.length,
          location: {
            index: 1 + docTitle.length + 2, // rough offset
          },
        },
      },
    ];

    // Insert table cell content
    let startIndex = docTitle.length + 2; // index after title
    let cellIndex = 0;

    for (const row of tableRows) {
      for (const cell of row.tableCells) {
        requests.push({
          insertText: {
            text: cell.content.toString(),
            location: { index: ++startIndex },
          },
        });

        // Optional: bold header
        if (cell.bold) {
          requests.push({
            updateTextStyle: {
              range: {
                startIndex,
                endIndex: startIndex + cell.content.length,
              },
              textStyle: { bold: true },
              fields: "bold",
            },
          });
        }

        startIndex += cell.content.length;
      }
    }

    await docs.documents.batchUpdate({
      GOOGLE_REPORTS_FOLDER_ID,
      requestBody: { requests },
    });

    logger.info(`Transaction doc created successfully: ${docTitle}`);
    return { success: true, documentId };

  } catch (error) {
    logger.error("Failed to create transaction document:", error);
    throw new Error("Google Docs sync failed");
  }
}


export default generateDailyReport