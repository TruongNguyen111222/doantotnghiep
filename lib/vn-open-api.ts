const BASE = "https://provinces.open-api.vn/api";

export type VnProvinceSummary = { code: number; name: string };

//hàm fetchProvinceList để lấy danh sách tỉnh/thành từ API của VN Open API
export async function fetchProvinceList(): Promise<VnProvinceSummary[]> {
  const res = await fetch(`${BASE}/`, { next: { revalidate: 86_400 } });
  if (!res.ok) throw new Error(`provinces list ${res.status}`);
  const data = (await res.json()) as { code: number; name: string }[];
  return data.map((p) => ({ code: p.code, name: p.name }));
}

export type VnWardSummary = { code: number; name: string };
//hàm fetchWardsForProvince để lấy danh sách phường/xã từ API của VN Open API
export async function fetchWardsForProvince(provinceCode: string): Promise<VnWardSummary[]> {
  const res = await fetch(`${BASE}/p/${provinceCode}?depth=3`, { next: { revalidate: 86_400 } });
  if (!res.ok) throw new Error(`province ${provinceCode} ${res.status}`);
  const province = (await res.json()) as {
    districts?: { wards?: { code: number; name: string }[] }[];
  };
  const wards: VnWardSummary[] = [];
  for (const d of province.districts || []) {
    for (const w of d.wards || []) {
      wards.push({ code: w.code, name: w.name });
    }
  }
  return wards.sort((a, b) => a.name.localeCompare(b.name, "vi"));
}
// File này kết nối với API công khai của Việt Nam (provinces.open-api.vn) để lấy dữ liệu 
// tỉnh/thành và phường/xã. Đây là nơi thực sự gọi ra internet để lấy dữ liệu địa giới hành chính.

