import dynamic from 'next/dynamic';
import { useRouter } from 'next/router';
import { LoadingOverlay } from '@car-erp/shared-ui';

const InventoryPage = dynamic(
  () => import('inventory/pages/PartsList'),
  {
    ssr: false,
    loading: () => <LoadingOverlay message="Loading inventory..." />,
  }
);

export default function InventoryRoute() {
  const router = useRouter();
  return <InventoryPage onNavigateToDetail={(id) => router.push(`/inventory/${id}`)} />;
}
