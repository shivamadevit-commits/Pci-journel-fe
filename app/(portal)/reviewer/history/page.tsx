import { AssignmentsTable } from '@/components/reviewer/assignments-table';
import { PageHeader } from '@/components/shared/page-header';

export default function ReviewHistoryPage() {
  return (
    <>
      <PageHeader title="Review history" description="Manuscripts you have already reviewed." />
      <AssignmentsTable history />
    </>
  );
}
