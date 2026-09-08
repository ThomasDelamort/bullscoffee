import express from "express";
import type { Request, Response } from "express";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

app.get("/", (req: Request, res: Response) => {
  return res.status(201).json({ server: "Welcome to Bull's Coffee!" });
});

app.listen(PORT, () => {
  console.log(`Server is listening at http://localhost:${PORT}`);
});
