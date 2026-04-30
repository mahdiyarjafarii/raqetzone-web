import { v4 as uuidv4 } from 'uuid';

async function downloader(fileUrl, filename) {
  const response = await fetch(fileUrl);
  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename || uuidv4();
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(url);
}

export default downloader;