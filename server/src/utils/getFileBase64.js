import { fileTypeFromBuffer } from "file-type";

async function getFileBase64(url) {
  const response = await fetch(url);
  if (!response.ok)
    throw new Error(`Failed to fetch image: ${response.statusText}`);

  // Convert to buffer and then to base64
  const arrayBuffer = await response.arrayBuffer();
  const base64 = Buffer.from(arrayBuffer).toString("base64");

  return {
    base64,
    mime: (await fileTypeFromBuffer(arrayBuffer)).mime,
  };
}

export default getFileBase64;
