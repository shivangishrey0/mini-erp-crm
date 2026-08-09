import "dotenv/config";
import cors from "cors";
import express from "express";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler";
import { prisma } from "./lib/prisma";
import authRoutes from "./routes/auth.routes";
import customerRoutes from "./routes/customer.routes";

const app = express();

app.use(cors());
app.use(express.json());

app.get("/health", async (req, res) => {
  await prisma.$queryRaw`SELECT 1`;
  res.json({ status: "ok" });
});

app.use("/auth", authRoutes);
app.use("/customers", customerRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

const port = process.env.PORT ?? 3000;

app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
