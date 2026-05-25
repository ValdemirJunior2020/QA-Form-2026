// C:\Users\Valdemir Goncalves\Desktop\Meus Projetos\qa-form-react-project\server\utils\googleSheets.js

const path = require("path");
const fs = require("fs");
const { google } = require("googleapis");

function getGoogleSheetsClient() {
  const jsonFileName = process.env.GOOGLE_SERVICE_ACCOUNT_JSON || "service-account.json";
  const keyFilePath = path.join(__dirname, "..", jsonFileName);

  if (!process.env.SPREADSHEET_ID) {
    throw new Error("Missing SPREADSHEET_ID in server/.env");
  }

  if (!fs.existsSync(keyFilePath)) {
    throw new Error(`Service account JSON file not found at: ${keyFilePath}`);
  }

  const auth = new google.auth.GoogleAuth({
    keyFile: keyFilePath,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"]
  });

  return google.sheets({
    version: "v4",
    auth
  });
}

module.exports = {
  getGoogleSheetsClient
};