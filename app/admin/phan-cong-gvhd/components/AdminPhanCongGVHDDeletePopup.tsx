"use client";
//component xóa phân công giảng viên hướng dẫn
import type { AssignmentItem } from "@/lib/types/admin-phan-cong-gvhd";
import MessagePopup from "../../../components/MessagePopup";
import { studentDisplay, supervisorDisplay } from "@/lib/utils/admin-phan-cong-gvhd-display"; //hàm hiển thị sinh viên và giảng viên hướng dẫn

import styles from "../../styles/dashboard.module.css";

type Props = { //props component xóa phân công giảng viên hướng dẫn
  deleteTarget: AssignmentItem | null; //phân công giảng viên hướng dẫn cần xóa
  busyId: string | null; //id phân công giảng viên hướng dẫn đang xử lý
  onClose: () => void; //hàm xử lý đóng popup
  onConfirm: () => void; //hàm xử lý xác nhận xóa phân công giảng viên hướng dẫn
};

export default function AdminPhanCongGVHDDeletePopup(props: Props) { //component xóa phân công giảng viên hướng dẫn
  const { deleteTarget, busyId, onClose, onConfirm } = props;

  if (!deleteTarget) return null;

  return (
    <MessagePopup
      open
      title="Xóa phân công"
      size="wide"
      onClose={onClose}
      actions={
        <>
          <button
            type="button"
            className={styles.btn}
            onClick={onClose}
            disabled={busyId === deleteTarget?.id}
          >
            Hủy
          </button>
          <button
            type="button"
            className={`${styles.btn} ${styles.btnDanger}`}
            onClick={onConfirm}
            disabled={busyId === deleteTarget?.id}
          >
            Xác nhận
          </button>
        </>
      }
    >
      <div style={{ display: "grid", gap: 10 }}>
        <table className={styles.viewModalDetailTable}>
          <tbody>
            <tr>
              <th scope="row">SV hướng dẫn</th>
              <td>
                {deleteTarget.student?.msv ? studentDisplay(deleteTarget.student as any) : "—"}
              </td>
            </tr>
            <tr>
              <th scope="row">Giảng viên hướng dẫn</th>
              <td>{supervisorDisplay(deleteTarget.supervisor as any) || "—"}</td>
            </tr>
            <tr>
              <th scope="row">Khoa</th>
              <td>{deleteTarget.faculty || "—"}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </MessagePopup>
  );
}

