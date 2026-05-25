"use client";
//component thêm phân công giảng viên hướng dẫn , nhận dữ liệu xử lý trả lại cho page gọi api để thêm phân công giảng viên hướng dẫn
import type { Dispatch, SetStateAction } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

import type { OpenBatch, SupervisorOption, StudentOption } from "@/lib/types/admin-phan-cong-gvhd";
import FormPopup from "../../../components/FormPopup"; //component popup form

import styles from "../../styles/dashboard.module.css";
import formStyles from "../../../auth/styles/register.module.css"; //style form
import { studentDisplay, supervisorDisplay } from "@/lib/utils/admin-phan-cong-gvhd-display"; //hàm hiển thị sinh viên và giảng viên hướng dẫn

function normalize(s: string) { //Chuyển chuỗi chữ Tiếng Việt có dấu thành chữ không dấu
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

export type Props = { //props component thêm phân công giảng viên hướng dẫn
  open: boolean; //trạng thái open của popup
  busyId: string | null; //id phân công giảng viên hướng dẫn đang xử lý

  faculties: string[]; //danh sách khoa
  openBatches: OpenBatch[]; //danh sách đợt thực tập
  supervisorOptions: SupervisorOption[]; //danh sách giảng viên hướng dẫn
  studentOptions: StudentOption[]; //danh sách sinh viên
  optionsLoading: boolean; //trạng thái loading

  formFaculty: string; //khoa đang chọn
  formBatchId: string; //đợt thực tập đang chọn
  formSupervisorId: string; //giảng viên hướng dẫn đang chọn
  formStudentIds: string[]; //danh sách sinh viên đang chọn
  fieldErrors: Record<string, string>; //lỗi form

  supervisorQ: string; //từ khóa tìm kiếm giảng viên hướng dẫn
  studentQ: string; //từ khóa tìm kiếm sinh viên

  onClose: () => void; //hàm xử lý đóng popup
  onSubmit: () => void; //hàm xử lý submit form

  setFormFaculty: Dispatch<SetStateAction<string>>; //hàm xử lý set khoa
  setFormBatchId: Dispatch<SetStateAction<string>>; //hàm xử lý set đợt thực tập
  setFormSupervisorId: Dispatch<SetStateAction<string>>; //hàm xử lý set giảng viên hướng dẫn
  setFormStudentIds: Dispatch<SetStateAction<string[]>>; //hàm xử lý set danh sách sinh viên
  setSupervisorQ: Dispatch<SetStateAction<string>>; //hàm xử lý set từ khóa tìm kiếm giảng viên hướng dẫn
  setStudentQ: Dispatch<SetStateAction<string>>; //hàm xử lý set từ khóa tìm kiếm sinh viên
};

type AnchorPos = { top: number; left: number; width: number }; //vị trí popup

function readAnchorPos(el: HTMLElement | null): AnchorPos | null { //hàm lấy vị trí popup
  if (!el) return null;
  const r = el.getBoundingClientRect();
  return { top: r.bottom + 6, left: r.left, width: r.width }; //vị trí popup
}

export default function AdminPhanCongGVHDFormPopup(props: Props) { //component thêm phân công giảng viên hướng dẫn
  const {
    open,
    busyId,

    faculties,
    openBatches,
    supervisorOptions,
    studentOptions,
    optionsLoading,

    formFaculty,
    formBatchId,
    formSupervisorId,
    formStudentIds,
    fieldErrors,

    supervisorQ,
    studentQ,

    onClose,
    onSubmit,

    setFormFaculty,
    setFormBatchId,
    setFormSupervisorId,
    setFormStudentIds,
    setSupervisorQ,
    setStudentQ
  } = props;

  if (!open) return null; //nếu không có popup thì không hiển thị

  const [supervisorOpen, setSupervisorOpen] = useState(false);
  const supervisorRootRef = useRef<HTMLDivElement | null>(null);
  const supervisorSearchRef = useRef<HTMLInputElement | null>(null);
  const supervisorBtnRef = useRef<HTMLButtonElement | null>(null);
  const [supervisorPos, setSupervisorPos] = useState<AnchorPos | null>(null);

  const [studentOpen, setStudentOpen] = useState(false);
  const studentRootRef = useRef<HTMLDivElement | null>(null);
  const studentSearchRef = useRef<HTMLInputElement | null>(null);
  const studentBtnRef = useRef<HTMLButtonElement | null>(null);
  const [studentPos, setStudentPos] = useState<AnchorPos | null>(null);

  const selectedSupervisor = useMemo(
    () => supervisorOptions.find((s) => s.id === formSupervisorId) ?? null,
    [supervisorOptions, formSupervisorId]
  );

  useEffect(() => {
    if (!supervisorOpen) return;
    const onDocMouseDown = (e: MouseEvent) => {
      const el = supervisorRootRef.current;
      if (!el) return;
      if (e.target instanceof Node && !el.contains(e.target)) setSupervisorOpen(false);
    };
    document.addEventListener("mousedown", onDocMouseDown);
    return () => document.removeEventListener("mousedown", onDocMouseDown);
  }, [supervisorOpen]);

  useEffect(() => {
    if (!supervisorOpen) return;
    const t = window.setTimeout(() => supervisorSearchRef.current?.focus(), 0);
    return () => window.clearTimeout(t);
  }, [supervisorOpen]);

  useEffect(() => {
    if (!supervisorOpen) return;
    const update = () => setSupervisorPos(readAnchorPos(supervisorBtnRef.current));
    update();
    window.addEventListener("resize", update);
    document.addEventListener("scroll", update, true);
    return () => {
      window.removeEventListener("resize", update);
      document.removeEventListener("scroll", update, true);
    };
  }, [supervisorOpen]);

  useEffect(() => {
    if (!studentOpen) return;
    const onDocMouseDown = (e: MouseEvent) => {
      const el = studentRootRef.current;
      if (!el) return;
      if (e.target instanceof Node && !el.contains(e.target)) setStudentOpen(false);
    };
    document.addEventListener("mousedown", onDocMouseDown);
    return () => document.removeEventListener("mousedown", onDocMouseDown);
  }, [studentOpen]);

  useEffect(() => {
    if (!studentOpen) return;
    const t = window.setTimeout(() => studentSearchRef.current?.focus(), 0);
    return () => window.clearTimeout(t);
  }, [studentOpen]);

  useEffect(() => {
    if (!studentOpen) return;
    const update = () => setStudentPos(readAnchorPos(studentBtnRef.current));
    update();
    window.addEventListener("resize", update);
    document.addEventListener("scroll", update, true);
    return () => {
      window.removeEventListener("resize", update);
      document.removeEventListener("scroll", update, true);
    };
  }, [studentOpen]);

  const filteredSupervisors = useMemo(() => {
    if (!supervisorQ.trim()) return supervisorOptions;
    const nq = normalize(supervisorQ);
    return supervisorOptions.filter((s) => normalize(s.fullName).includes(nq));
  }, [supervisorOptions, supervisorQ]);

  const selectedStudents = useMemo(() => {
    const set = new Set(formStudentIds.map(String));
    return studentOptions.filter((s) => set.has(String(s.id)));
  }, [formStudentIds, studentOptions]);

  const filteredStudents = useMemo(() => {
    if (!studentQ.trim()) return studentOptions;
    const nq = normalize(studentQ);
    return studentOptions.filter((s) => normalize(`${s.msv} ${s.fullName}`).includes(nq));
  }, [studentOptions, studentQ]);

  return (
    <FormPopup
      open
      title="Thêm phân công"
      size="extraWide"
      onClose={onClose}
      busy={busyId === "submit"}
      actions={
        <>
          <button type="button" className={styles.btn} onClick={onClose} disabled={busyId === "submit"}>
            Hủy
          </button>
          <button
            type="button"
            className={`${styles.btn} ${styles.btnPrimary}`}
            onClick={() => void onSubmit()}
            disabled={busyId === "submit"}
          >
            Tạo
          </button>
        </>
      }
    >
      <div className={formStyles.formGroup}>
        <label className={formStyles.label}>Khoa</label>
        <select
          className={formStyles.input}
          value={formFaculty}
          onChange={(e) => {
            setFormFaculty(e.target.value);
            setFormSupervisorId("");
            setFormStudentIds([]);
          }}
        >
          <option value="">Chọn khoa</option>
          {faculties.map((f) => (
            <option key={f} value={f}>
              {f}
            </option>
          ))}
        </select>
        {fieldErrors.faculty ? <p className={styles.error}>{fieldErrors.faculty}</p> : null}
      </div>

      <div className={formStyles.formGroup}>
        <label className={formStyles.label}>Đợt thực tập</label>
        <select
          className={formStyles.input}
          value={formBatchId}
          onChange={(e) => {
            setFormBatchId(e.target.value);
            setFormSupervisorId("");
            setFormStudentIds([]);
          }}
        >
          <option value="">Chọn đợt thực tập (đang mở)</option>
          {openBatches.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name} ({b.semester} - {b.schoolYear})
            </option>
          ))}
        </select>
        {fieldErrors.internshipBatchId ? (
          <p className={styles.error}>{fieldErrors.internshipBatchId}</p>
        ) : null}
      </div>

      <div className={formStyles.formGroup}>
        <label className={formStyles.label}>Giảng viên hướng dẫn</label>
        <div ref={supervisorRootRef} className={formStyles.comboRoot}>
          <button
            ref={supervisorBtnRef}
            type="button"
            className={`${formStyles.comboControl} ${formStyles.comboControlGreen} ${
              supervisorOpen ? formStyles.comboControlOpenGreen : ""
            }`}
            disabled={!formFaculty || !formBatchId}
            aria-haspopup="listbox"
            aria-expanded={supervisorOpen}
            onClick={() => setSupervisorOpen((v) => !v)}
            title={!formFaculty || !formBatchId ? "Vui lòng chọn khoa và đợt thực tập trước." : undefined}
          >
            <span className={formStyles.comboValue}>
              {selectedSupervisor ? (
                supervisorDisplay({ fullName: selectedSupervisor.fullName, degree: selectedSupervisor.degree })
              ) : (
                <span className={formStyles.comboPlaceholder}>
                  {optionsLoading ? "Đang tải..." : "Chọn giảng viên hướng dẫn"}
                </span>
              )}
            </span>
            <span className={formStyles.comboCaret} aria-hidden="true">
              ▾
            </span>
          </button>

          {supervisorOpen && supervisorPos
            ? createPortal(
                <div
                  className={formStyles.comboDropdown}
                  role="dialog"
                  aria-label="Chọn giảng viên hướng dẫn"
                  style={{
                    position: "fixed",
                    top: supervisorPos.top,
                    left: supervisorPos.left,
                    width: supervisorPos.width,
                    zIndex: 9999
                  }}
                  onMouseDown={(e) => e.stopPropagation()}
                >
                  <div className={formStyles.comboSearchRow}>
                    <input
                      ref={supervisorSearchRef}
                      className={`${formStyles.comboSearch} ${formStyles.comboSearchGreen}`}
                      value={supervisorQ}
                      onChange={(e) => setSupervisorQ(e.target.value)}
                      placeholder="Tìm kiếm giảng viên hướng dẫn theo họ tên…"
                      disabled={!formFaculty || !formBatchId}
                    />
                  </div>
                  <div className={formStyles.comboList} role="listbox" aria-multiselectable="false">
                    {filteredSupervisors.length ? (
                      filteredSupervisors.map((s) => {
                        const selected = s.id === formSupervisorId;
                        return (
                          <button
                            key={s.id}
                            type="button"
                            className={`${formStyles.comboOption} ${
                              selected ? formStyles.comboOptionSelectedGreen : ""
                            }`}
                            role="option"
                            aria-selected={selected}
                            onClick={() => {
                              setFormSupervisorId(s.id);
                              setSupervisorOpen(false);
                            }}
                          >
                            <span
                              className={`${formStyles.comboOptionCheck} ${formStyles.comboOptionCheckGreen}`}
                              aria-hidden="true"
                            >
                              {selected ? "✓" : ""}
                            </span>
                            <span className={formStyles.comboOptionText}>
                              {supervisorDisplay({ fullName: s.fullName, degree: s.degree })}
                            </span>
                          </button>
                        );
                      })
                    ) : (
                      <div className={formStyles.comboEmpty}>Không có kết quả.</div>
                    )}
                  </div>
                </div>,
                document.body
              )
            : null}
        </div>
        {fieldErrors.supervisorProfileId ? (
          <p className={styles.error}>{fieldErrors.supervisorProfileId}</p>
        ) : null}
      </div>

      <div className={formStyles.formGroup}>
        <label className={formStyles.label}>SV hướng dẫn</label>
        <div ref={studentRootRef} className={formStyles.comboRoot}>
          <button
            ref={studentBtnRef}
            type="button"
            className={`${formStyles.comboControl} ${formStyles.comboControlGreen} ${
              studentOpen ? formStyles.comboControlOpenGreen : ""
            }`}
            disabled={!formFaculty || !formBatchId}
            aria-haspopup="listbox"
            aria-expanded={studentOpen}
            onClick={() => setStudentOpen((v) => !v)}
            title={!formFaculty || !formBatchId ? "Vui lòng chọn khoa và đợt thực tập trước." : undefined}
          >
            <span className={formStyles.comboValue}>
              {selectedStudents.length ? (
                selectedStudents.length === 1
                  ? studentDisplay(selectedStudents[0])
                  : `Đã chọn ${selectedStudents.length} sinh viên`
              ) : (
                <span className={formStyles.comboPlaceholder}>
                  {optionsLoading ? "Đang tải..." : "Chọn sinh viên hướng dẫn"}
                </span>
              )}
            </span>
            <span className={formStyles.comboCaret} aria-hidden="true">
              ▾
            </span>
          </button>

          {studentOpen && studentPos
            ? createPortal(
                <div
                  className={formStyles.comboDropdown}
                  role="dialog"
                  aria-label="Chọn sinh viên hướng dẫn"
                  style={{
                    position: "fixed",
                    top: studentPos.top,
                    left: studentPos.left,
                    width: studentPos.width,
                    zIndex: 9999
                  }}
                  onMouseDown={(e) => e.stopPropagation()}
                >
                  <div className={formStyles.comboSearchRow}>
                    <input
                      ref={studentSearchRef}
                      className={`${formStyles.comboSearch} ${formStyles.comboSearchGreen}`}
                      value={studentQ}
                      onChange={(e) => setStudentQ(e.target.value)}
                      placeholder="Tìm kiếm SV theo MSV hoặc họ tên"
                      disabled={!formFaculty || !formBatchId}
                    />
                  </div>
                  <div className={formStyles.comboList} role="listbox" aria-multiselectable="true">
                    {filteredStudents.length ? (
                      filteredStudents.map((s) => {
                        const selected = formStudentIds.includes(s.id);
                        return (
                          <button
                            key={s.id}
                            type="button"
                            className={`${formStyles.comboOption} ${
                              selected ? formStyles.comboOptionSelectedGreen : ""
                            }`}
                            role="option"
                            aria-selected={selected}
                            onClick={() => {
                              setFormStudentIds((prev) =>
                                prev.includes(s.id) ? prev.filter((id) => id !== s.id) : [...prev, s.id]
                              );
                            }}
                          >
                            <span
                              className={`${formStyles.comboOptionCheck} ${formStyles.comboOptionCheckGreen}`}
                              aria-hidden="true"
                            >
                              {selected ? "✓" : ""}
                            </span>
                            <span className={formStyles.comboOptionText}>
                              {studentDisplay({ msv: s.msv, fullName: s.fullName, degree: s.degree })}
                            </span>
                          </button>
                        );
                      })
                    ) : (
                      <div className={formStyles.comboEmpty}>Không có kết quả.</div>
                    )}
                  </div>
                </div>,
                document.body
              )
            : null}
        </div>

        {fieldErrors.studentProfileIds ? <p className={styles.error}>{fieldErrors.studentProfileIds}</p> : null}
      </div>
    </FormPopup>
  );
}
