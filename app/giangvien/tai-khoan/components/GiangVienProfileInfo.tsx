import type { GiangVienMe } from "@/lib/types/giangvien-tai-khoan"; //kiểu dữ liệu giảng viên
import { genderLabel } from "@/lib/constants/giangvien-tai-khoan"; //hàm xử lý giới tính
import { formatDateVi } from "@/lib/utils/giangvien-tai-khoan"; //hàm xử lý ngày tháng năm
import adminStyles from "../../../admin/styles/dashboard.module.css";

type Props = {
  me: GiangVienMe; //giảng viên
};

export default function GiangVienProfileInfo({ me }: Props) { //component xem thông tin giảng viên
  return (
    <table className={adminStyles.viewModalDetailTable} style={{ marginTop: 8 }}>
      <tbody>
        <tr>
          <th scope="row">Họ tên</th>
          <td>{me.fullName}</td>
        </tr>
        <tr>
          <th scope="row">Email</th>
          <td>{me.email}</td>
        </tr>
        <tr>
          <th scope="row">Ngày sinh</th>
          <td>{formatDateVi(me.birthDate)}</td>
        </tr>
        <tr>
          <th scope="row">Giới tính</th>
          <td>{genderLabel[me.gender]}</td>
        </tr>
        <tr>
          <th scope="row">Khoa</th>
          <td>{me.faculty}</td>
        </tr>
      </tbody>
    </table>
  );
}
