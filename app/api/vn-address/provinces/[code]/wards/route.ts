import { NextResponse } from "next/server";
import { fetchWardsForProvince } from "@/lib/vn-open-api"; //hàm lấy danh sách huyện/xã từ API

export async function GET(_request: Request, { params }: { params: Promise<{ code: string }> }) { //hàm lấy danh sách huyện/xã từ API 
  const { code } = await params;
  if (!/^\d+$/.test(code)) {
    return NextResponse.json({ message: "Mã tỉnh không hợp lệ." }, { status: 400 });
  }
  try {
    const wards = await fetchWardsForProvince(code); //gọi hàm lấy danh sách huyện/xã từ API
    return NextResponse.json({ items: wards, wards }); //trả về danh sách huyện/xã
  } catch {
    return NextResponse.json({ message: "Không tải được phường xã." }, { status: 502 });
  }
}
