// C:\Users\Valdemir Goncalves\Desktop\Meus Projetos\qa-form-react-project\server\index.js

require("dotenv").config();

const express = require("express");
const cors = require("cors");
const appDataRoutes = require("./routes/appData.routes");

const app = express();

app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:5173"
  })
);

app.use(express.json());

app.use("/api", appDataRoutes);

app.get("/", (req, res) => {
  res.send("QA Form Quiz Server is running.");
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});