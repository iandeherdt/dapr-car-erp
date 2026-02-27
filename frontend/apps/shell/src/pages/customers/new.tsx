import dynamic from 'next/dynamic';
import { LoadingOverlay } from '@car-erp/shared-ui';

const CustomerNewPage = dynamic(
  () => import('customers/pages/CustomerNew'),
  {
    ssr: false,
    loading: () => <LoadingOverlay message="Loading..." />,
  }
);

export default function CustomerNewRoute() {
  return <CustomerNewPage />;
}
