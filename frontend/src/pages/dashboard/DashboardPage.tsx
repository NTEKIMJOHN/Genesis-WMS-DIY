import { Card, CardHeader, CardBody, Badge } from '../../components/ui';
import { useAuthStore } from '../../store';

// ==========================================
// DASHBOARD PAGE
// ==========================================

export const DashboardPage: React.FC = () => {
  const user = useAuthStore((state) => state.user);

  const stats = [
    { label: 'Today\'s Receipts', value: '0', color: 'text-primary-600' },
    { label: 'Pending Variances', value: '0', color: 'text-warning-600' },
    { label: 'Putaway Tasks', value: '0', color: 'text-success-600' },
    { label: 'Active LPNs', value: '0', color: 'text-blue-600' },
  ];

  const recentActivities = [
    { id: 1, action: 'ASN received', item: 'ASN-2026-001', time: 'Just now', status: 'COMPLETED' },
    { id: 2, action: 'Variance created', item: 'VAR-001', time: '5 min ago', status: 'PENDING' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Welcome back, {user?.firstName}!
        </h1>
        <p className="mt-1 text-sm text-gray-600">
          Here's what's happening in your warehouse today.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => (
          <Card key={stat.label}>
            <CardBody>
              <p className="text-sm font-medium text-gray-600">{stat.label}</p>
              <p className={`mt-2 text-3xl font-bold ${stat.color}`}>{stat.value}</p>
            </CardBody>
          </Card>
        ))}
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader title="Recent Activity" />
        <CardBody>
          <div className="space-y-4">
            {recentActivities.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No recent activity</p>
            ) : (
              recentActivities.map((activity) => (
                <div key={activity.id} className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{activity.action}</p>
                    <p className="text-sm text-gray-500">{activity.item}</p>
                  </div>
                  <div className="flex items-center space-x-4">
                    <span className="text-sm text-gray-500">{activity.time}</span>
                    <Badge status={activity.status}>{activity.status}</Badge>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardBody>
      </Card>
    </div>
  );
};
