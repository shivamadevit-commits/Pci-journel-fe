import { AssignmentsTable } from '@/components/reviewer/assignments-table';
import { PageHeader } from '@/components/shared/page-header';

export default function ReviewerAssignmentsPage() {
  return (
    <>
      <PageHeader title="Assigned manuscripts" description="Manuscripts assigned to you for double-blind review." />
      <AssignmentsTable />
    </>
  );
}
