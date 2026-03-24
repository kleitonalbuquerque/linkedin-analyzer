import express from "express";
import cors from "cors";
import analyzeRoute from "./routes/analyze.js";

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.use("/analyze", analyzeRoute);

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
