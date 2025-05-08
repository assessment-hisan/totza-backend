// utils/googleAuth.js
import { google } from "googleapis";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";
dotenv.config();

/**
 * Gets an authenticated Google API client using a JSON key file
 * This approach is more reliable than using environment variables for the private key
 */
export function getGoogleAuthClient() {
  try {
    console.log("Setting up Google authentication with JSON key file...");
    
    // Determine the path to the credentials file based on environment
    // In local development, use a local path relative to project root
    // In production (Render.com), use the path where you've uploaded the file
    const keyFilePath = process.env.NODE_ENV === "production" 
      ? process.env.GOOGLE_APPLICATION_CREDENTIALS // Path on Render.com
      : path.join(process.cwd(), "config", "../../googleCredentials"); // Local path
    
    console.log(`Using credentials file at: ${keyFilePath}`);
    
    // Verify file exists and is readable
    if (!fs.existsSync(keyFilePath)) {
      throw new Error(`Credentials file not found at: ${keyFilePath}`);
    }
    
    // Create authentication client using the key file
    const auth = new google.auth.GoogleAuth({
      keyFile: keyFilePath,
      scopes: ["https://www.googleapis.com/auth/spreadsheets", // Existing Sheets access
      "https://www.googleapis.com/auth/drive.file",  // For file management
      "https://www.googleapis.com/auth/documents"],
    });
    
    console.log("Google Auth client created successfully");
    return auth;
  } catch (error) {
    console.error("Error setting up Google authentication:", error);
    throw new Error(`Failed to initialize Google Auth: ${error.message}`);
  }
}