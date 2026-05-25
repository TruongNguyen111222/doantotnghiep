"use client";
//popup xem thông tin sinh viên
import type { ViewStudent } from "@/lib/types/admin-quan-ly-sinh-vien";
import {
  ADMIN_QUAN_LY_SINH_VIEN_DEGREE_LABEL,
  ADMIN_QUAN_LY_SINH_VIEN_GENDER_LABEL,
  ADMIN_QUAN_LY_SINH_VIEN_INTERNSHIP_STATUS_LABEL
} from "@/lib/constants/admin-quan-ly-sinh-vien"; //hằng số sinh viên
import { toBirthDateInputValue } from "@/lib/utils/admin-quan-ly-sinh-vien-dates"; //hàm chuyển đổi ngày sinh sang định dạng input
import MessagePopup from "../../../components/MessagePopup";
import styles from "../../styles/dashboard.module.css";

type Props = { //type props popup xem sinh viên
  open: boolean; //trạng thái popup
  student: ViewStudent | null; //dữ liệu sinh viên
  onClose: () => void; //hàm đóng popup
};

export default function AdminSinhVienViewPopup(props: Props) {
  const { open, student, onClose } = props;
  if (!open || !student) return null;

  return (
    <MessagePopup open title="Xem thông tin sinh viên" size="extraWide" onClose={onClose}>
      <table className={styles.viewModalDetailTable}>
        <tbody>
          <tr>
            <th scope="row">MSV</th>
            <td>{student.msv}</td>
          </tr>
          <tr>
            <th scope="row">Họ tên</th>
            <td>{student.fullName}</td>
          </tr>
          <tr>
            <th scope="row">Lớp</th>
            <td>{student.className}</td>
          </tr>
          <tr>
            <th scope="row">Khoa</th>
            <td>{student.faculty}</td>
          </tr>
          <tr>
            <th scope="row">Khóa</th>
            <td>{student.cohort}</td>
          </tr>
          <tr>
            <th scope="row">Bậc</th>
            <td>{ADMIN_QUAN_LY_SINH_VIEN_DEGREE_LABEL[student.degree]}</td>
          </tr>
          <tr>
            <th scope="row">SĐT</th>
            <td>{student.phone ?? "—"}</td>
          </tr>
          <tr>
            <th scope="row">Email</th>
            <td>{student.email}</td>
          </tr>
          <tr>
            <th scope="row">Ngày sinh</th>
            <td>{student.birthDate ? toBirthDateInputValue(student.birthDate) : "—"}</td>
          </tr>
          <tr>
            <th scope="row">Giới tính</th>
            <td>{student.gender ? ADMIN_QUAN_LY_SINH_VIEN_GENDER_LABEL[student.gender] : "—"}</td>
          </tr>
          <tr>
            <th scope="row">Địa chỉ thường trú</th>
            <td>
              {[student.permanentProvinceName, student.permanentWardName].filter(Boolean).join(" - ") || "—"}
            </td>
          </tr>
          <tr>
            <th scope="row">Trạng thái thực tập</th>
            <td>{ADMIN_QUAN_LY_SINH_VIEN_INTERNSHIP_STATUS_LABEL[student.internshipStatus]}</td>
          </tr>
        </tbody>
      </table>
    </MessagePopup>
  );
}
