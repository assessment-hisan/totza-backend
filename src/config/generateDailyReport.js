// utils/generateDailyReport.js
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

    // Configuration
    const TARGET_FOLDER_ID = process.env.GOOGLE_REPORTS_FOLDER_ID;
    if (!TARGET_FOLDER_ID) {
      throw new Error("GOOGLE_REPORTS_FOLDER_ID is not set in .env");
    }

    // Fetch today's transactions
    const transactions = await CompanyTransaction.find({
      createdAt: {
        $gte: todayStart,
        $lte: todayEnd
      }
    }).sort({ createdAt: 1 });

    if (transactions.length === 0) {
      console.log("No transactions found for today");
      return { 
        success: true,
        message: "No transactions to report today",
        docCreated: false
      };
    }

    // Calculate statistics
    const stats = {
      totalAmount: transactions.reduce((sum, t) => sum + t.amount, 0),
      typeCounts: transactions.reduce((counts, t) => {
        counts[t.type] = (counts[t.type] || 0) + 1;
        return counts;
      }, {})
    };

    // Create blank document first
    const doc = await docs.documents.create({
      requestBody: {
        title: docTitle
      }
    });

    const documentId = doc.data.documentId;
    console.log(`Document created with ID: ${documentId}`);

    // Move document to target folder using Drive API
    await drive.files.update({
      fileId: documentId,
      addParents: TARGET_FOLDER_ID,
      fields: 'id,parents'
    });

    // Generate report header content
    const headerContent = [
      `DAILY TRANSACTION REPORT - ${dateString}`,
      `\nGenerated: ${new Date().toLocaleString()}\n`,
      `\nSUMMARY:`,
      `Total Transactions: ${transactions.length}`,
      `Total Amount: $${stats.totalAmount.toFixed(2)}`,
      `\nTransaction Counts by Type:`,
      ...Object.entries(stats.typeCounts).map(([type, count]) => `- ${type}: ${count}`),
      `\n\nDETAILED TRANSACTIONS:\n`
    ].join('\n');

    // Prepare all document requests
    const requests = [
      // Insert header content
      {
        insertText: {
          text: headerContent,
          location: { index: 1 }
        }
      },
      // Format title
      {
        updateTextStyle: {
          range: {
            startIndex: 1,
            endIndex: headerContent.split('\n')[0].length + 1
          },
          textStyle: {
            bold: true,
            fontSize: { magnitude: 16, unit: 'PT' }
          },
          fields: "bold,fontSize"
        }
      },
      // Format section headers
      {
        updateTextStyle: {
          range: {
            startIndex: headerContent.indexOf('SUMMARY:'),
            endIndex: headerContent.indexOf('SUMMARY:') + 8
          },
          textStyle: {
            bold: true,
            fontSize: { magnitude: 14, unit: 'PT' }
          },
          fields: "bold,fontSize"
        }
      },
      {
        updateTextStyle: {
          range: {
            startIndex: headerContent.indexOf('DETAILED TRANSACTIONS:'),
            endIndex: headerContent.indexOf('DETAILED TRANSACTIONS:') + 21
          },
          textStyle: {
            bold: true,
            fontSize: { magnitude: 14, unit: 'PT' }
          },
          fields: "bold,fontSize"
        }
      },
      // Create table (7 columns)
      {
        insertTable: {
          rows: 1,
          columns: 7,
          location: { index: headerContent.length + 1 }
        }
      },
      // Format table header row
      {
        updateTableRowStyle: {
          tableStartLocation: { index: headerContent.length + 1 },
          rowIndex: 0,
          tableRowStyle: {
            minRowHeight: { magnitude: 20, unit: 'PT' }
          },
          fields: "minRowHeight"
        }
      },
      // Add column headers
      {
        insertText: {
          text: "Date\tType\tAmount\tAccount\tVendor\tItems\tPurpose\n",
          location: { index: headerContent.length + 2 }
        }
      },
      // Format column headers
      {
        updateTextStyle: {
          range: {
            startIndex: headerContent.length + 2,
            endIndex: headerContent.length + 100
          },
          textStyle: {
            bold: true,
            backgroundColor: { 
              color: { 
                rgbColor: { red: 0.9, green: 0.9, blue: 0.9 } 
              } 
            }
          },
          fields: "bold,backgroundColor"
        }
      }
    ];

    // Add transaction rows to table
    transactions.forEach((t, i) => {
      const rowStartIndex = headerContent.length + 2 + (i + 1) * 100; // Approximate position
      const rowText = [
        new Date(t.createdAt).toLocaleDateString(),
        t.type.toUpperCase(),
        `$${t.amount.toFixed(2)}`,
        t.account,
        t.vendor || "N/A",
        t.items ? t.items.join(", ") : "N/A",
        t.purpose
      ].join('\t') + '\n';

      requests.push(
        {
          insertText: {
            text: rowText,
            location: { index: rowStartIndex }
          }
        },
        // Alternate row colors
        {
          updateTableCellStyle: {
            tableStartLocation: { index: headerContent.length + 1 },
            rowIndex: i + 1,
            tableCellStyle: {
              backgroundColor: { 
                color: { 
                  rgbColor: { 
                    red: i % 2 ? 0.98 : 1, 
                    green: i % 2 ? 0.98 : 1, 
                    blue: i % 2 ? 0.98 : 1 
                  } 
                } 
              }
            },
            fields: "backgroundColor"
          }
        }
      );
    });

    // Set column widths
    const columnWidths = [100, 80, 80, 120, 120, 150, 200]; // In points
    columnWidths.forEach((width, index) => {
      requests.push({
        updateTableColumnProperties: {
          tableStartLocation: { index: headerContent.length + 1 },
          columnIndices: [index],
          tableColumnProperties: {
            widthType: "FIXED_WIDTH",
            width: { magnitude: width, unit: "PT" }
          },
          fields: "widthType,width"
        }
      });
    });

    // Execute all requests in a single batch
    await docs.documents.batchUpdate({
      documentId,
      requestBody: { requests }
    });

    // Set permissions
    await drive.permissions.create({
      fileId: documentId,
      requestBody: {
        role: 'reader',
        type: 'anyone'
      }
    });

    // Verify document exists and get URL
    const fileInfo = await drive.files.get({
      fileId: documentId,
      fields: 'id,name,webViewLink,parents'
    });

    const docUrl = fileInfo.data.webViewLink;
    console.log(`Document successfully saved to: ${docUrl}`);

    return { 
      success: true,
      docCreated: true,
      documentId,
      docTitle,
      docUrl,
      folderId: TARGET_FOLDER_ID,
      stats: {
        transactionCount: transactions.length,
        totalAmount: stats.totalAmount
      }
    };

  } catch (error) {
    console.error("Error in generateDailyReport:", {
      message: error.message,
      stack: error.stack,
      response: error.response?.data
    });
    
    if (error.response?.data?.error) {
      console.error("Google API Error Details:", error.response.data.error);
    }
    
    throw {
      ...error,
      isReportError: true,
      documentSaved: false
    };
  }
}

export default generateDailyReport;