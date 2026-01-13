import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardHeader, CardBody, Badge, Button, StatusBadge } from '../../components/ui';
import { useAuthStore } from '../../store';
import asnService from '../../services/asn.service';
import varianceService from '../../services/variance.service';
import putawayService from '../../services/putaway.service';
import lpnService from '../../services/lpn.service';
import blindReceiptService from '../../services/blindReceipt.service';
import { formatDateTime } from '../../utils/helpers';
import { showErrorToast } from '../../store/uiStore';

// ==========================================
// DASHBOARD PAGE
// ==========================================

export const DashboardPage: React.FC = () => {
  const user = useAuthStore((state) => state.user);
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);

  const [stats, setStats] = useState({
    todaysReceipts: 0,
    pendingVariances: 0,
    putawayTasks: 0,
    activeLPNs: 0,
    arrivingToday: 0,
    highPriorityTasks: 0,
  });

  const [recentASNs, setRecentASNs] = useState<any[]>([]);
  const [recentVariances, setRecentVariances] = useState<any[]>([]);
  const [pendingApprovals, setPendingApprovals] = useState<any[]>([]);

  useEffect(() => {
    loadDashboardData();
    // Refresh every 30 seconds
    const interval = setInterval(loadDashboardData, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadDashboardData = async () => {
    setIsLoading(true);
    try {
      // Load all dashboard data in parallel
      const [
        asnsResponse,
        variancesResponse,
        putawayResponse,
        lpnResponse,
        blindReceiptsResponse,
      ] = await Promise.all([
        asnService.getASNs({ limit: 5 }).catch(() => ({ data: [], pagination: { total: 0 } })),
        varianceService.getVariances({ status: 'PENDING', limit: 5 }).catch(() => ({ data: [], pagination: { total: 0 } })),
        putawayService.getPutawayTasks({ status: 'PENDING', limit: 10 }).catch(() => ({ data: [], pagination: { total: 0 } })),
        lpnService.getLPNs({ status: 'AVAILABLE', limit: 10 }).catch(() => ({ data: [], pagination: { total: 0 } })),
        blindReceiptService.getBlindReceipts({ status: 'PENDING_APPROVAL', limit: 5 }).catch(() => ({ data: [], pagination: { total: 0 } })),
      ]);

      // Calculate arriving today
      const today = new Date().toDateString();
      const arrivingToday = asnsResponse.data.filter((asn: any) => {
        const arrivalDate = new Date(asn.expectedArrivalDate).toDateString();
        return arrivalDate === today && (asn.shipmentStatus === 'IN_TRANSIT' || asn.shipmentStatus === 'ARRIVED');
      }).length;

      // Get high priority putaway tasks
      const highPriorityTasks = putawayResponse.data.filter(
        (task: any) => task.priority === 'HIGH' || task.priority === 'URGENT'
      ).length;

      setStats({
        todaysReceipts: asnsResponse.data.filter((asn: any) => {
          const createdDate = new Date(asn.createdAt).toDateString();
          return createdDate === today;
        }).length,
        pendingVariances: variancesResponse.pagination.total,
        putawayTasks: putawayResponse.pagination.total,
        activeLPNs: lpnResponse.pagination.total,
        arrivingToday,
        highPriorityTasks,
      });

      setRecentASNs(asnsResponse.data.slice(0, 5));
      setRecentVariances(variancesResponse.data.slice(0, 5));
      setPendingApprovals(blindReceiptsResponse.data.slice(0, 5));
    } catch (error) {
      showErrorToast('Failed to load dashboard data');
    } finally {
      setIsLoading(false);
    }
  };

  const quickActions = [
    {
      title: 'Receive ASN',
      description: 'Start receiving an ASN shipment',
      icon: '📦',
      action: () => navigate('/asn'),
      color: 'bg-primary-50 border-primary-200',
    },
    {
      title: 'Create Blind Receipt',
      description: 'Log unplanned delivery',
      icon: '📝',
      action: () => navigate('/blind-receipts/create'),
      color: 'bg-blue-50 border-blue-200',
    },
    {
      title: 'Review Variances',
      description: 'Approve/reject variances',
      icon: '⚠️',
      action: () => navigate('/variance'),
      color: 'bg-warning-50 border-warning-200',
    },
    {
      title: 'Manage LPNs',
      description: 'View and manage LPNs',
      icon: '🏷️',
      action: () => navigate('/lpn'),
      color: 'bg-success-50 border-success-200',
    },
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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card>
          <CardBody>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Today's Receipts</p>
                <p className="mt-2 text-3xl font-bold text-primary-600">
                  {isLoading ? '...' : stats.todaysReceipts}
                </p>
                <p className="mt-1 text-xs text-gray-500">ASNs received today</p>
              </div>
              <div className="text-4xl">📦</div>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardBody>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Pending Variances</p>
                <p className="mt-2 text-3xl font-bold text-warning-600">
                  {isLoading ? '...' : stats.pendingVariances}
                </p>
                <p className="mt-1 text-xs text-gray-500">Awaiting review</p>
              </div>
              <div className="text-4xl">⚠️</div>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardBody>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Putaway Tasks</p>
                <p className="mt-2 text-3xl font-bold text-success-600">
                  {isLoading ? '...' : stats.putawayTasks}
                </p>
                <p className="mt-1 text-xs text-gray-500">
                  {stats.highPriorityTasks} high priority
                </p>
              </div>
              <div className="text-4xl">📍</div>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardBody>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Active LPNs</p>
                <p className="mt-2 text-3xl font-bold text-blue-600">
                  {isLoading ? '...' : stats.activeLPNs}
                </p>
                <p className="mt-1 text-xs text-gray-500">Available for picking</p>
              </div>
              <div className="text-4xl">🏷️</div>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardBody>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Arriving Today</p>
                <p className="mt-2 text-3xl font-bold text-purple-600">
                  {isLoading ? '...' : stats.arrivingToday}
                </p>
                <p className="mt-1 text-xs text-gray-500">Expected shipments</p>
              </div>
              <div className="text-4xl">🚚</div>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardBody>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Pending Approvals</p>
                <p className="mt-2 text-3xl font-bold text-orange-600">
                  {isLoading ? '...' : pendingApprovals.length}
                </p>
                <p className="mt-1 text-xs text-gray-500">Blind receipts</p>
              </div>
              <div className="text-4xl">✓</div>
            </div>
          </CardBody>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader title="Quick Actions" />
        <CardBody>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {quickActions.map((action) => (
              <button
                key={action.title}
                onClick={action.action}
                className={`p-4 border-2 rounded-lg hover:shadow-md transition-all ${action.color}`}
              >
                <div className="text-3xl mb-2">{action.icon}</div>
                <p className="font-semibold text-gray-900">{action.title}</p>
                <p className="text-sm text-gray-600 mt-1">{action.description}</p>
              </button>
            ))}
          </div>
        </CardBody>
      </Card>

      {/* Two-column layout for lists */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent ASNs */}
        <Card>
          <CardHeader
            title="Recent ASNs"
            subtitle={`${recentASNs.length} recent shipments`}
            action={
              <Button size="sm" variant="ghost" onClick={() => navigate('/asn')}>
                View All
              </Button>
            }
          />
          <CardBody>
            {isLoading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto" />
              </div>
            ) : recentASNs.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No recent ASNs</p>
            ) : (
              <div className="space-y-3">
                {recentASNs.map((asn) => (
                  <div
                    key={asn.id}
                    onClick={() => navigate(`/asn/${asn.id}`)}
                    className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg cursor-pointer transition-colors"
                  >
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">{asn.asnNumber}</p>
                      <p className="text-sm text-gray-500">
                        {asn.supplier?.name || 'Unknown Supplier'}
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        {formatDateTime(asn.createdAt)}
                      </p>
                    </div>
                    <StatusBadge status={asn.shipmentStatus} />
                  </div>
                ))}
              </div>
            )}
          </CardBody>
        </Card>

        {/* Pending Variances */}
        <Card>
          <CardHeader
            title="Pending Variances"
            subtitle={`${recentVariances.length} awaiting review`}
            action={
              <Button size="sm" variant="ghost" onClick={() => navigate('/variance')}>
                View All
              </Button>
            }
          />
          <CardBody>
            {isLoading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto" />
              </div>
            ) : recentVariances.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No pending variances</p>
            ) : (
              <div className="space-y-3">
                {recentVariances.map((variance) => (
                  <div
                    key={variance.id}
                    onClick={() => navigate('/variance')}
                    className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg cursor-pointer transition-colors"
                  >
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">{variance.skuCode}</p>
                      <p className="text-sm text-gray-500">{variance.productName}</p>
                      <p className="text-xs text-warning-600 font-medium mt-1">
                        Variance: {variance.varianceQuantity > 0 ? '+' : ''}
                        {variance.varianceQuantity} ({variance.variancePercentage.toFixed(1)}%)
                      </p>
                    </div>
                    <Badge status={variance.priority}>{variance.priority}</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardBody>
        </Card>
      </div>

      {/* Pending Approvals */}
      {(user?.role === 'RECEIVING_SUPERVISOR' || user?.role === 'WAREHOUSE_MANAGER') &&
        pendingApprovals.length > 0 && (
          <Card>
            <CardHeader
              title="Pending Approvals"
              subtitle={`${pendingApprovals.length} blind receipts awaiting approval`}
              action={
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => navigate('/blind-receipts')}
                >
                  View All
                </Button>
              }
            />
            <CardBody>
              <div className="space-y-3">
                {pendingApprovals.map((receipt) => (
                  <div
                    key={receipt.id}
                    onClick={() => navigate('/blind-receipts')}
                    className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg cursor-pointer transition-colors"
                  >
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">
                        {receipt.receiptNumber}
                      </p>
                      <p className="text-sm text-gray-500">{receipt.supplierName}</p>
                      <p className="text-xs text-gray-400 mt-1">
                        {receipt.totalLines} lines / {receipt.totalUnits} units
                      </p>
                    </div>
                    <Badge status={receipt.receiptType}>
                      {receipt.receiptType.replace(/_/g, ' ')}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardBody>
          </Card>
        )}
    </div>
  );
};
