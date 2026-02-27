import dynamic from 'next/dynamic';
import { LoadingOverlay } from '@car-erp/shared-ui';

const InvoicesPage = dynamic(
  () => import('billing/pages/InvoiceList'),
  {
    ssr: false,
    loading: () => <LoadingOverlay message="Loading invoices..." />,
  }
);

export default function InvoicesRoute() {
  return <InvoicesPage />;
}
