import React from 'react';

interface EmptyStateProps {
  title: string;
  description?: string;
  action?: React.ReactNode;
  icon?: React.ReactNode;
}

export function EmptyState({ title, description, action, icon }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 rounded-lg border border-dashed border-gray-300 bg-gray-50 px-6 py-12 text-center">
      {icon && (
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 text-gray-400">
          {icon}
        </div>
      )}
      <div className="space-y-1">
        <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
        {description && (
          <p className="text-sm text-gray-500">{description}</p>
        )}
      </div>
      {action && <div>{action}</div>}
    </div>
  );
}
