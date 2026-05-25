
export function guessMimeFromFileName(file: File): string { //
  if (file.type) return file.type; 
  const n = file.name.toLowerCase();  
  if (n.endsWith(".pdf")) return "application/pdf"; 
  if (n.endsWith(".doc")) return "application/msword";
  if (n.endsWith(".docx")) return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  if (n.endsWith(".png")) return "image/png";
  if (n.endsWith(".jpg") || n.endsWith(".jpeg")) return "image/jpeg";
  if (n.endsWith(".webp")) return "image/webp";
  if (n.endsWith(".gif")) return "image/gif";
  return "application/octet-stream";
}

export type FileBase64Payload = { base64: string; mime: string }; 

//đọc file và chuyển thành base64 để gửi lên server
export function readFileAsBase64Payload(file: File): Promise<FileBase64Payload> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      const comma = dataUrl.indexOf(",");
      if (comma === -1) {
        reject(new Error("invalid data URL"));
        return;
      }
      const header = dataUrl.slice(0, comma);
      const mimeMatch = /^data:([^;]+)/.exec(header);
      const fromUrl = mimeMatch ? mimeMatch[1] : "";
      const mime = fromUrl && fromUrl !== "application/octet-stream" ? fromUrl : guessMimeFromFileName(file);
      resolve({ base64: dataUrl.slice(comma + 1), mime });
    };
    reader.onerror = () => reject(reader.error ?? new Error("Đọc file thất bại."));
    reader.readAsDataURL(file);
  });
}
