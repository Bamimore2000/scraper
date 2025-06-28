// db.js
import mongoose from "mongoose";

export async function connectDB() {
  try {
    await mongoose.connect(
      "mongodb+srv://emmanuelar35:sxG9TgyKX3VbZsMd@cluster0.xwgzp2g.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0",
      {
        useNewUrlParser: true,
        useUnifiedTopology: true,
      }
    );
    console.log("MongoDB connected");
  } catch (error) {
    console.error("MongoDB connection error:", error);
    process.exit(1); // stop app if DB connection fails
  }
}
