import crypto from "crypto";

const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
const apiKey = process.env.CLOUDINARY_API_KEY;
const apiSecret = process.env.CLOUDINARY_API_SECRET;

/**
 * Uploads a remote image URL or a base64 string to Cloudinary.
 * Returns the secure_url if successful, otherwise null.
 */
export async function uploadImageToCloudinary(fileData: string): Promise<string | null> {
  if (!cloudName || !apiKey || !apiSecret) {
    console.error("[cloudinary] Missing credentials in environment variables");
    return null;
  }

  // If the fileData is empty or is already a Cloudinary URL, return it as-is.
  if (!fileData || fileData.includes("res.cloudinary.com")) {
    return fileData;
  }

  try {
    const timestamp = Math.round(new Date().getTime() / 1000).toString();

    // Sign parameters
    const stringToSign = `timestamp=${timestamp}${apiSecret}`;
    const signature = crypto.createHash("sha1").update(stringToSign).digest("hex");

    const formData = new FormData();
    formData.append("file", fileData);
    formData.append("api_key", apiKey);
    formData.append("timestamp", timestamp);
    formData.append("signature", signature);

    const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
      method: "POST",
      body: formData,
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error("[cloudinary] Upload failed status:", res.status, errText);
      return null;
    }

    const data = await res.json().catch(() => ({}));
    if (data.secure_url) {
      return data.secure_url as string;
    }

    return null;
  } catch (error) {
    console.error("[cloudinary] Upload exception:", error);
    return null;
  }
}
