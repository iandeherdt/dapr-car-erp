import dynamic from 'next/dynamic';
import { useRouter } from 'next/router';
import { LoadingOverlay } from '@car-erp/shared-ui';

const PartDetailPage = dynamic(
  () => import('inventory/pages/PartDetail'),
  {
    ssr: false,
    loading: () => <LoadingOverlay message="Loading part..." />,
  }
);

export default function PartDetailRoute() {
  const router = useRouter();
  const id = router.query.id as string;
  return <PartDetailPage id={id} onNavigateBack={() => router.push('/inventory')} />;
}
