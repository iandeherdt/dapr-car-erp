import dynamic from 'next/dynamic';
import { useRouter } from 'next/router';
import { LoadingOverlay } from '@car-erp/shared-ui';

const CustomerDetailPage = dynamic(
  () => import('customers/pages/CustomerDetail'),
  {
    ssr: false,
    loading: () => <LoadingOverlay message="Loading customer..." />,
  }
);

export default function CustomerDetailRoute() {
  const router = useRouter();
  const id = router.query.id as string;
  return <CustomerDetailPage id={id} />;
}
