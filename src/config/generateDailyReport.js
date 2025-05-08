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
    }).populate('account', 'name')
      .populate('addedBy', 'name')
      .sort({ createdAt: 1 })
      .lean();

    if (!transactions.length) {
      logger.warn("No transactions found for today.");
      return { success: false, message: "No transactions to sync" };
    }
  console.log(transactions)
    // STEP 1: Create an empty document
    logger.info("Creating new Google Doc...");
    const createResponse = await docs.documents.create({
      requestBody: {
        title: docTitle,
      },
    });

    const documentId = createResponse.data.documentId;
    logger.info(`Created document with ID: ${documentId}`);

    // If a parent folder is specified, move the document to that folder
    if (process.env.GOOGLE_REPORTS_FOLDER_ID) {
      logger.info(`Moving document to folder ${process.env.GOOGLE_REPORTS_FOLDER_ID}`);
      await drive.files.update({
        fileId: documentId,
        addParents: process.env.GOOGLE_REPORTS_FOLDER_ID,
        fields: 'id, parents',
      });
    }

    // STEP 2: Get the document to understand its structure
    logger.info("Fetching document structure...");
    const doc = await docs.documents.get({
      documentId,
    });

    // A new Google Doc always has a default paragraph at the beginning
    // We'll use this to insert our content

    // STEP 3: Prepare the content
    // Define our table headers
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

    // Create a batch of requests to build our document
    const requests = [];

    // First request: Add the title (at the document's first paragraph)
    requests.push({
      insertText: {
        location: {
          index: 1, // The first paragraph in a new document always starts at index 1
        },
        text: docTitle,
      },
    });

    // Format the title as a heading
    requests.push({
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
    });

    // Add a couple of line breaks after the title
    requests.push({
      insertText: {
        location: {
          index: 1 + docTitle.length,
        },
        text: "\n\n",
      },
    });

    // The current end index will be: 1 (start) + docTitle.length + 2 ("\n\n")
    const tableStartIndex = 1 + docTitle.length + 2;

    // Insert a table with headers and data rows
    requests.push({
      insertTable: {
        rows: transactions.length + 1, // +1 for header row
        columns: headers.length,
        location: {
          index: tableStartIndex,
        },
      },
    });

    // Apply all these initial structural changes
    logger.info("Applying document structure...");
    await docs.documents.batchUpdate({
      documentId,
      requestBody: {
        requests,
      },
    });

    // STEP 4: Now get the updated document with the table structure
    logger.info("Fetching updated document with table...");
    const updatedDoc = await docs.documents.get({
      documentId,
    });

    // Find the table in the document
    const tableElement = updatedDoc.data.body.content.find(
      (element) => element.table !== undefined
    );

    if (!tableElement || !tableElement.table) {
      throw new Error("Could not find the created table in the document");
    }

    // STEP 5: Populate the table cells with our data
    const tableCellRequests = [];

    // Helper function to safely get cell start index
    function getCellStartIndex(row, col) {
      try {
        const cell = tableElement.table.tableRows[row].tableCells[col];
        if (cell && cell.content && cell.content[0] &&
          cell.content[0].paragraph && cell.content[0].paragraph.elements &&
          cell.content[0].paragraph.elements[0]) {
          return cell.content[0].paragraph.elements[0].startIndex;
        }
        logger.warn(`Cannot find start index for cell at row ${row}, col ${col}`);
        return null;
      } catch (err) {
        logger.warn(`Error getting cell index at row ${row}, col ${col}: ${err.message}`);
        return null;
      }
    }

    // Populate header row
    logger.info("Populating table headers...");
    for (let col = 0; col < headers.length; col++) {
      const startIndex = getCellStartIndex(0, col);
      if (startIndex === null) continue;

      // Insert header text
      tableCellRequests.push({
        insertText: {
          location: { index: startIndex },
          text: headers[col],
        },
      });

      // Make header bold
      tableCellRequests.push({
        updateTextStyle: {
          range: {
            startIndex,
            endIndex: startIndex + headers[col].length,
          },
          textStyle: { bold: true },
          fields: "bold",
        },
      });
    }

    // Populate data rows
    logger.info(`Populating ${transactions.length} transaction rows...`);
    for (let row = 0; row < transactions.length; row++) {
      const txn = transactions[row];
      const rowData = [
        new Date(txn.date).toLocaleDateString(),
        txn.type || "N/A",
        txn.amount?.toString() || "0",
        txn.account || "N/A",
        txn.vendor || "N/A",
        txn.purpose || "N/A",
        txn.addedBy?.toString() || "N/A",
        txn.createdAt ? new Date(txn.createdAt).toLocaleTimeString() : "N/A",
      ];

      for (let col = 0; col < rowData.length; col++) {
        // Add 1 to row index because row 0 is the header
        const startIndex = getCellStartIndex(row + 1, col);
        if (startIndex === null) continue;

        tableCellRequests.push({
          insertText: {
            location: { index: startIndex },
            text: rowData[col],
          },
        });
      }
    }

    // Apply all cell content in batches to avoid API limits
    const BATCH_SIZE = 100;
    logger.info(`Applying ${tableCellRequests.length} cell updates in batches...`);

    for (let i = 0; i < tableCellRequests.length; i += BATCH_SIZE) {
      const batchRequests = tableCellRequests.slice(i, i + BATCH_SIZE);

      await docs.documents.batchUpdate({
        documentId,
        requestBody: {
          requests: batchRequests,
        },
      });

      logger.info(`Applied batch ${Math.floor(i / BATCH_SIZE) + 1} of ${Math.ceil(tableCellRequests.length / BATCH_SIZE)}`);
    }

    logger.info(`Transaction doc created successfully: ${docTitle}`);

    return {
      success: true,
      documentId,
      url: `https://docs.google.com/document/d/${documentId}/edit`
    };

  } catch (error) {
    logger.error("Failed to create transaction document:", error);
    throw new Error(`Google Docs sync failed: ${error.message}`);
  }
}

export default generateDailyReport;