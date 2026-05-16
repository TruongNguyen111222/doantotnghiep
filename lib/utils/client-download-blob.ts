//tải file từ API một cách an toàn và ổn định.

function parseFilenameFromContentDisposition(header: string | null): string | null { //lấy tên file từ response header
  if (!header) return null; //nếu header không có thì trả về null
  const star = header.match(/filename\*=UTF-8''([^;\s]+)/i);
  if (star?.[1]) { //nếu star có [1] thì decodeURIComponent(star[1].trim())
    try {
      const n = decodeURIComponent(star[1].trim());
      return n || null; //nếu n là string và có trim thì trả về n.trim()      
    } catch {
      /* ignore */
    }
  }
  const q = header.match(/filename="((?:\\.|[^"\\])*)"/i);
  if (q?.[1]) return q[1].replace(/\\"/g, '"').trim() || null;
  const plain = header.match(/filename=([^;\s]+)/i);
  if (plain?.[1]) return plain[1].replace(/^["']|["']$/g, "").trim() || null;
  return null;
}

/**
 * Tải file qua fetch (credentials) rồi blob — ổn định hơn `<a href>` với API có cookie / lỗi mạng.
 * Chỉ gọi từ client.
 */
export async function downloadWithCredentials( //tải file bằng fetch + blob
  url: string, //url của file
  filenameFallback: string //tên file fallback
): Promise<{ ok: true } | { ok: false; message: string }> {
  let res: Response; //response từ api
  try {
    res = await fetch(url, { credentials: "include", cache: "no-store" }); //fetch file từ api với credentials và cache
  } catch {
    return { ok: false, message: "Không kết nối được máy chủ." }; //nếu không kết nối được máy chủ thì trả về lỗi
  }
  if (!res.ok) { //nếu response không ok thì trả về lỗi
    let message = `Lỗi ${res.status}`; //lấy message từ response
    try {
      const j = (await res.json()) as { message?: string }; //lấy message từ response
      if (typeof j.message === "string" && j.message.trim()) message = j.message.trim(); //nếu message là string và có trim thì trả về message.trim()
    } catch {
      /* ignore */ //nếu không lấy được message thì ignore
    }
    return { ok: false, message }; //nếu không lấy được message thì trả về lỗi
  }
  let blob: Blob; //blob của file
  try {
    blob = await res.blob(); //lấy blob của file
  } catch {
    return { ok: false, message: "Không đọc được nội dung file." }; //nếu không đọc được nội dung file thì trả về lỗi
  }
  if (blob.size === 0) { //nếu file rỗng thì trả về lỗi
    return { ok: false, message: "File rỗng." }; //nếu file rỗng thì trả về lỗi
  }
  const fromServer = parseFilenameFromContentDisposition(res.headers.get("Content-Disposition")); //lấy tên file từ response header
  const downloadName = fromServer || filenameFallback || "download"; //lấy tên file từ response header hoặc tên file fallback hoặc "download"
  const objectUrl = URL.createObjectURL(blob); 
  try {
    const a = document.createElement("a"); //tạo element a
    a.href = objectUrl; //set href của element a
    a.download = downloadName; //set download của element a
    a.rel = "noreferrer"; //set rel của element a
    document.body.appendChild(a);
    a.click(); //click element a
    a.remove(); //remove element a
  } finally {
    URL.revokeObjectURL(objectUrl); //revoke object url
  }
  return { ok: true }; //trả về thành công  
}
