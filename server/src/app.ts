import "dotenv/config";
import cors from "cors";
import express from "express";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler";
import { prisma } from "./lib/prisma";
import authRoutes from "./routes/auth.routes";
import customerRoutes from "./routes/customer.routes";
import productRoutes from "./routes/product.routes";
import inventoryRoutes from "./routes/inventory.routes";
import locationRoutes from "./routes/location.routes";
import workOrderRoutes from "./routes/workOrder.routes";
import transferRoutes from "./routes/transfer.routes";
import orderRoutes from "./routes/order.routes";

export function createApp() {
  const app = express();

  // Allow-list read from env (comma-separated), so a new deployed frontend
  // origin never requires editing this file - falls back to the local Vite
  // dev server so `npm run dev` keeps working unconfigured.
  const allowedOrigins = (process.env.CORS_ORIGINS ?? process.env.CLIENT_URL ?? "http://localhost:5173")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

  app.use(
    cors({
      origin: allowedOrigins,
      credentials: true,
    })
  );
  app.use(express.json());

  app.get("/health", async (req, res) => {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: "ok" });
  });

  app.use("/auth", authRoutes);
  app.use("/customers", customerRoutes);
  app.use("/products", productRoutes);
  app.use("/inventory", inventoryRoutes);
  app.use("/locations", locationRoutes);
  app.use("/work-orders", workOrderRoutes);
  app.use("/transfers", transferRoutes);
  app.use("/orders", orderRoutes);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
