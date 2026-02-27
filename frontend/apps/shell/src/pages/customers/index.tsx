import dynamic from 'next/dynamic';
import { LoadingOverlay } from '@car-erp/shared-ui';

const CustomersPage = dynamic(
  () => import('customers/pages/CustomerList'),
  {
    ssr: false,
    loading: () => <LoadingOverlay message="Loading customers..." />,
  }
);

export default function CustomersRoute() {
  return <CustomersPage />;
}
