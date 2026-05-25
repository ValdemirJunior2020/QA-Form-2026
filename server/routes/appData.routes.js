// C:\Users\Valdemir Goncalves\Desktop\Meus Projetos\qa-form-react-project\server\routes\appData.routes.js

const express = require("express");
const router = express.Router();
const { getGoogleSheetsClient } = require("../utils/googleSheets");

router.get("/app-data", async (req, res) => {
  try {
    const sheets = getGoogleSheetsClient();
    const spreadsheetId = process.env.SPREADSHEET_ID;

    const qaFormResponse = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: "QA Form!A1:I"
    });

    const rubricResponse = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: "Rubric (Calibration)!A1:I"
    });

    res.json({
      ok: true,
      appName: "QA Form Quiz Coaching Tool",
      passingScore: 90,
      qaFormRows: qaFormResponse.data.values || [],
      rubricRows: rubricResponse.data.values || []
    });
  } catch (error) {
    console.error("APP DATA ERROR:", error);

    res.status(500).json({
      ok: false,
      message: error.message || "Failed to load app data",
      details: String(error)
    });
  }
});

module.exports = router;