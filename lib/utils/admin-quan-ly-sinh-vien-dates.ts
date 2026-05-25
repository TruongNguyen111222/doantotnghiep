//hàm tính tuổi từ ngày sinh và chuyển đổi ngày sinh sang định dạng input

export function todayDateInputValue() { //hàm lấy ngày hiện tại
  const d = new Date();
  const yyyy = d.getFullYear(); //năm
  const mm = String(d.getMonth() + 1).padStart(2, "0"); //tháng
  const dd = String(d.getDate()).padStart(2, "0"); //ngày
  return `${yyyy}-${mm}-${dd}`; //trả về ngày hiện tại
}

export function calcAgeFromBirthDate(birthDate: string) { //hàm tính tuổi từ ngày sinh
  const birth = new Date(`${birthDate}T00:00:00.000Z`); //ngày sinh
  if (Number.isNaN(birth.getTime())) return null; //nếu ngày sinh không hợp lệ thì trả về null
  const now = new Date(); //ngày hiện tại
  let age = now.getUTCFullYear() - birth.getUTCFullYear(); //tuổi
  const m = now.getUTCMonth() - birth.getUTCMonth(); //tháng
  if (m < 0 || (m === 0 && now.getUTCDate() < birth.getUTCDate())) age -= 1; //nếu tháng hiện tại nhỏ hơn tháng sinh thì trừ 1 tuổi
  return age;
}

export function toBirthDateInputValue(iso: string | null) { //hàm chuyển đổi ngày sinh sang định dạng input
  if (!iso) return ""; //nếu ngày sinh không hợp lệ thì trả về rỗng
  return new Date(iso).toISOString().slice(0, 10); //chuyển đổi ngày sinh sang định dạng input
}

