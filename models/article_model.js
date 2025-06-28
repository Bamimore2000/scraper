import mongoose from "mongoose";

const articleSchema = new mongoose.Schema(
  {
    text: { type: String, required: true },
    link: { type: String, required: true, unique: true },
    title: { type: String },
    date: { type: String },
    imageurl: { type: String },
    lead: { type: String },
  },
  {
    timestamps: true, // Adds createdAt and updatedAt
  }
);

const Article = mongoose.model("Article", articleSchema);

export default Article;
