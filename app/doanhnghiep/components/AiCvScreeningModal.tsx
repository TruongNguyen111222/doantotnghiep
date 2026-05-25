"use client";

import FormPopup from "../../components/FormPopup";
import aiStyles from "./ai-cv-screening.module.css";
import AiCvScreeningPanel from "./AiCvScreeningPanel";

type Props = {
  open: boolean;
  applicationId: string | null;
  applicantName: string;
  onClose: () => void;
};

export default function AiCvScreeningModal({ open, applicationId, applicantName, onClose }: Props) {
  if (!applicationId) return null;

  return (
    <FormPopup
      open={open}
      title={`Phân tích CV bằng AI · ${applicantName}`}
      size="extraWide"
      busy={false}
      onClose={onClose}
      actions={
        <div className={aiStyles.modalFooter}>
          <button type="button" className={`${aiStyles.btnBase} ${aiStyles.btnSecondary}`} onClick={onClose}>
            Đóng
          </button>
        </div>
      }
    >
      <AiCvScreeningPanel applicationId={applicationId} active={open} />
    </FormPopup>
  );
}
