import React from 'react';
import { useLocation } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function PlaceholderPage() {
  const location = useLocation();
  const pathParts = location.pathname.split('/').filter(Boolean);
  const title = pathParts[pathParts.length - 1] || 'Page';
  const formattedTitle = title.charAt(0).toUpperCase() + title.slice(1);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">{formattedTitle}</h1>
        <p className="text-gray-500">This section is currently under development.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{formattedTitle} Module</CardTitle>
          <CardDescription>
            This module will be implemented in the next phase of development.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-64 flex items-center justify-center border-2 border-dashed border-gray-200 rounded-lg bg-gray-50">
            <p className="text-gray-500 text-sm">Coming Soon</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
