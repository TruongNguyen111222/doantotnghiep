export type AssignmentStatus = "GUIDING" | "COMPLETED"; //trạng thái phân công giảng viên hướng dẫn

export type StudentDegree = "BACHELOR" | "ENGINEER"; //bậc sinh viên

export type SupervisorDegree = "MASTER" | "PHD" | "ASSOC_PROF" | "PROF"; //bậc giảng viên

export type OpenBatch = { //batch mở
  id: string; //id batch
  name: string; //tên batch
  semester: string; //học kỳ
  schoolYear: string; //năm học
};

export type AssignmentItem = { //phân công giảng viên hướng dẫn
  id: string; //id phân công giảng viên hướng dẫn
  supervisorAssignmentId: string; //id phân công giảng viên hướng dẫn
  faculty: string; //khoa
  status: AssignmentStatus; //trạng thái phân công giảng viên hướng dẫn
  batch: {
    id: string | null; //id batch
    name: string | null; //tên batch
    semester: string | null; //học kỳ
    schoolYear: string | null; //năm học
    status: string | null; //trạng thái batch
  };
  supervisor: { id: string | null; fullName: string; degree: SupervisorDegree | null }; //giảng viên hướng dẫn
  student: { id: string | null; msv: string; fullName: string; degree: StudentDegree | null }; //sinh viên
};

export type SupervisorOption = { id: string; fullName: string; degree: SupervisorDegree; faculty: string }; //giảng viên hướng dẫn
export type StudentOption = { id: string; msv: string; fullName: string; degree: StudentDegree }; //sinh viên

