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
    const drive = google.drive({ version: "v3", auth: authClient });
    
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
    
    // Step 1: Create an empty document with title
    const createResponse = await docs.documents.create({
      requestBody: {
        title: docTitle,
      },
    });
    
    const documentId = createResponse.data.documentId;
    
    // If a parent folder is specified, move the document to that folder
    if (process.env.GOOGLE_REPORTS_FOLDER_ID) {
      await drive.files.update({
        fileId: documentId,
        addParents: process.env.GOOGLE_REPORTS_FOLDER_ID,
        fields: 'id, parents',
      });
    }
    
    // Step 2: Define the table structure
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
    
    // Create row data for the table
    const tableRows = [
      // Header row
      headers.map(header => ({
        content: header,
        bold: true,
      })),
      // Data rows
      ...transactions.map((txn) => ([
        new Date(txn.date).toLocaleDateString(),
        txn.type || "N/A",
        txn.amount?.toString() || "0",
        txn.account || "N/A",
        txn.vendor || "N/A",
        txn.purpose || "N/A",
        txn.addedBy?.toString() || "N/A",
        txn.createdAt ? new Date(txn.createdAt).toLocaleTimeString() : "N/A",
      ])),
    ];
    
    // Step 3: First, add a title paragraph at the beginning of the document
    const titleRequests = [
      {
        insertText: {
          location: {
            index: 1, // The first valid insertion point in a new document
          },
          text: `${docTitle}\n\n`, // Add some space after the title
        },
      },
      {
        updateParagraphStyle: {
          range: {
            startIndex: 1,
            endIndex: 1 + docTitle.length,
          },
          paragraphStyle: {
            namedStyleType: "HEADING_1",
          },
          fields: "namedStyleType",
        },
      },
    ];
    
    // Apply the title updates
    await docs.documents.batchUpdate({
      documentId,
      requestBody: {
        requests: titleRequests,
      },
    });
    
    // Step 4: Get the document to calculate the current end index
    const document = await docs.documents.get({
      documentId,
    });
    
    // Find the end of the document content
    const endIndex = document.data.body.content[0].endIndex;
    
    // Step 5: Create the table structure
    const createTableRequest = {
      insertTable: {
        rows: tableRows.length,
        columns: headers.length,
        location: {
          index: endIndex - 1, // Insert at the end of the document
        },
      },
    };
    
    await docs.documents.batchUpdate({
      documentId,
      requestBody: {
        requests: [createTableRequest],
      },
    });
    
    // Step 6: Get updated document to find table cell locations
    const updatedDoc = await docs.documents.get({
      documentId,
    });
    
    // Find table in the document
    const tableElement = updatedDoc.data.body.content.find(
      (element) => element.table !== undefined
    );
    
    if (!tableElement || !tableElement.table) {
      throw new Error("Could not find the created table in the document");
    }
    
    // Step 7: Populate the table with data
    const tableCellRequests = [];
    
    // Iterate through each row in our data
    for (let rowIndex = 0; rowIndex < tableRows.length; rowIndex++) {
      const rowData = tableRows[rowIndex];
      const tableRow = tableElement.table.tableRows[rowIndex];
      
      // For header row (special case)
      if (rowIndex === 0) {
        for (let colIndex = 0; colIndex < headers.length; colIndex++) {
          const cell = tableRow.tableCells[colIndex];
          const cellContent = rowData[colIndex].content;
          const startIndex = cell.content[0].paragraph.elements[0].startIndex;
          const endIndex = cell.content[0].paragraph.elements[0].endIndex;
          
          // Insert text
          tableCellRequests.push({
            insertText: {
              location: { index: startIndex },
              text: cellContent,
            },
          });
          
          // Bold the header
          tableCellRequests.push({
            updateTextStyle: {
              range: {
                startIndex,
                endIndex: startIndex + cellContent.length,
              },
              textStyle: { bold: true },
              fields: "bold",
            },
          });
        }
      } else {
        // For data rows
        for (let colIndex = 0; colIndex < headers.length; colIndex++) {
          const cell = tableRow.tableCells[colIndex];
          const cellContent = rowData[colIndex];
          const startIndex = cell.content[0].paragraph.elements[0].startIndex;
          
          tableCellRequests.push({
            insertText: {
              location: { index: startIndex },
              text: cellContent,
            },
          });
        }
      }
    }
    
    // Apply the cell content updates
    if (tableCellRequests.length > 0) {
      await docs.documents.batchUpdate({
        documentId,
        requestBody: {
          requests: tableCellRequests,
        },
      });
    }
    
    logger.info(`Transaction doc created successfully: ${docTitle}`);
    return { success: true, documentId };
    
  } catch (error) {
    logger.error("Failed to create transaction document:", error);
    throw new Error(`Google Docs sync failed: ${error.message}`);
  }
}

export default generateDailyReport;