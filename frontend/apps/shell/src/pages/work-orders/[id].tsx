import dynamic from 'next/dynamic';
import { useRouter } from 'next/router';
import { LoadingOverlay } from '@car-erp/shared-ui';

const WorkOrderDetailPage = dynamic(
  () => import('workorders/pages/WorkOrderDetail'),
  {
    ssr: false,
    loading: () => <LoadingOverlay message="Loading work order..." />,
  }
);

export default function WorkOrderDetailRoute() {
  const router = useRouter();
  const id = router.query.id as string;
  return <WorkOrderDetailPage id={id} />;
}
