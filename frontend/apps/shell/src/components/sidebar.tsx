'use client';

import Link from 'next/link';
import { useRouter } from 'next/router';
import {
  LayoutDashboard,
  Users,
  Wrench,
  Package,
  FileText,
} from 'lucide-react';

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

const navItems: NavItem[] = [
  { label: 'Dashboard', href: '/', icon: LayoutDashboard },
  { label: 'Customers', href: '/customers', icon: Users },
  { label: 'Work Orders', href: '/work-orders', icon: Wrench },
  { label: 'Inventory', href: '/inventory', icon: Package },
  { label: 'Invoices', href: '/invoices', icon: FileText },
];

export function Sidebar() {
  const router = useRouter();
  const pathname = router.pathname;

  function isActive(href: string): boolean {
    if (href === '/') {
      return pathname === '/';
    }
    return pathname.startsWith(href);
  }

  return (
    <aside className="fixed left-0 top-0 h-full w-64 bg-slate-900 flex flex-col z-10">
      {/* Company name header */}
      <div className="px-6 py-5 border-b border-slate-700">
        <div className="flex items-center gap-2">
          <Wrench className="h-6 w-6 text-blue-400" />
          <span className="text-white font-semibold text-lg leading-tight">
            AutoRepair ERP
          </span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={[
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                active
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white',
              ].join(' ')}
            >
              <Icon className="h-5 w-5 flex-shrink-0" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-6 py-4 border-t border-slate-700">
        <p className="text-slate-500 text-xs">v0.0.1</p>
      </div>
    </aside>
  );
}
