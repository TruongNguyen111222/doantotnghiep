export function todayDateInputValue() { //hàm lấy ngày hiện tại
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; //trả về ngày hiện tại
}

export function calcAgeFromBirthDate(birthDate: string) { //hàm tính tuổi từ ngày sinh
  const birth = new Date(`${birthDate}T00:00:00.000Z`);
  if (Number.isNaN(birth.getTime())) return null; //nếu ngày sinh không hợp lệ thì trả về null
  const now = new Date(); //ngày hiện tại
  let age = now.getUTCFullYear() - birth.getUTCFullYear(); //tuổi
  const m = now.getUTCMonth() - birth.getUTCMonth(); //tháng
  if (m < 0 || (m === 0 && now.getUTCDate() < birth.getUTCDate())) age -= 1;
  return age; //trả về tuổi
}

export function toBirthDateInputValue(iso: string | null) {
  if (!iso) return ""; //nếu ngày sinh không hợp lệ thì trả về rỗng
  return new Date(iso).toISOString().slice(0, 10); //trả về ngày sinh
}

