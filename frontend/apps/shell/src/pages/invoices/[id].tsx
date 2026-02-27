import dynamic from 'next/dynamic';
import { useRouter } from 'next/router';
import { LoadingOverlay } from '@car-erp/shared-ui';

const InvoiceDetailPage = dynamic(
  () => import('billing/pages/InvoiceDetail'),
  {
    ssr: false,
    loading: () => <LoadingOverlay message="Loading invoice..." />,
  }
);

export default function InvoiceDetailRoute() {
  const router = useRouter();
  const id = router.query.id as string;
  return <InvoiceDetailPage id={id} />;
}
