"use client";

import FormPopup from "../../components/FormPopup";
import modalStyles from "./ai-cv-screening-modal.module.css";
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
      backdropZIndex={60}
      disableFieldset
      onClose={onClose}
      actions={
        <div className={modalStyles.modalFooter}>
          <button type="button" className={`${modalStyles.btnBase} ${modalStyles.btnSecondary}`} onClick={onClose}>
            Đóng
          </button>
        </div>
      }
    >
      <AiCvScreeningPanel applicationId={applicationId} active={open} />
    </FormPopup>
  );
}
