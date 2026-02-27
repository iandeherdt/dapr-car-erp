import dynamic from 'next/dynamic';
import { LoadingOverlay } from '@car-erp/shared-ui';

const WorkOrderNewPage = dynamic(
  () => import('workorders/pages/WorkOrderNew'),
  {
    ssr: false,
    loading: () => <LoadingOverlay message="Loading..." />,
  }
);

export default function WorkOrderNewRoute() {
  return <WorkOrderNewPage />;
}
