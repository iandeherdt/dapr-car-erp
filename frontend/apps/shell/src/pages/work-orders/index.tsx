import dynamic from 'next/dynamic';
import { LoadingOverlay } from '@car-erp/shared-ui';

const WorkOrdersPage = dynamic(
  () => import('workorders/pages/WorkOrderList'),
  {
    ssr: false,
    loading: () => <LoadingOverlay message="Loading work orders..." />,
  }
);

export default function WorkOrdersRoute() {
  return <WorkOrdersPage />;
}
