import AiCvScreeningPanel from "../../components/AiCvScreeningPanel";
import dashboardStyles from "../../styles/dashboard.module.css";

type Props = {
  params: Promise<{ applicationId: string }>;
};

export default async function AiCvScreeningPage({ params }: Props) {
  const { applicationId } = await params;
  return (
    <main className={dashboardStyles.page}>
      <div style={{ maxWidth: 960 }}>
        <header className={dashboardStyles.header}>
          <h1 className={dashboardStyles.title}>Phân tích CV bằng AI</h1>
          <p className={dashboardStyles.subtitle}>
            Hỗ trợ doanh nghiệp đối chiếu CV ứng viên với yêu cầu tuyển dụng.
          </p>
        </header>
        <AiCvScreeningPanel applicationId={applicationId} />
      </div>
    </main>
  );
}
