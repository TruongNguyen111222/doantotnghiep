import { NextResponse } from "next/server";
import { fetchProvinceList } from "@/lib/vn-open-api"; //gọi hàm fetchProvinceList để lấy danh sách tỉnh/thành từ API của VN Open API

export async function GET() {
  try {
    const provinces = await fetchProvinceList(); //gọi hàm fetchProvinceList để lấy danh sách tỉnh/thành từ API của VN Open API
    return NextResponse.json({ items: provinces, provinces }); //trả về danh sách tỉnh/thành
  } catch {
    return NextResponse.json({ message: "Không tải được danh mục tỉnh thành." }, { status: 502 }); //trả về danh sách tỉnh/thành rỗng nếu có lỗi
  }
}
