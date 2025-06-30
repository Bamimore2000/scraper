import axios from "axios";

export async function shortenUrl(longUrl) {
  try {
    const res = await axios.get(
      `https://tinyurl.com/api-create.php?url=${encodeURIComponent(longUrl)}`
    );
    return res.data;
  } catch (err) {
    console.error("TinyURL error:", err.message);
    return longUrl; // fallback to original
  }
}
