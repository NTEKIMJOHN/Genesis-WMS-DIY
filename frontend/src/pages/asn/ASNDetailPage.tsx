import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useASNStore } from '../../store';
import {
  Card,
  CardHeader,
  CardBody,
  Button,
  StatusBadge,
  Badge,
  Table,
  ConfirmModal,
} from '../../components/ui';
import { formatDate, formatDateTime, formatNumber } from '../../utils/helpers';
import { showErrorToast, showSuccessToast } from '../../store/uiStore';

export const ASNDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { currentASN, isLoading, fetchASNById, markASNArrived, startReceiving, cancelASN } =
    useASNStore();

  const [showCancelModal, setShowCancelModal] = useState(false);

  useEffect(() => {
    if (id) {
      fetchASNById(id).catch(() => {
        showErrorToast('Failed to load ASN', 'ASN not found');
        navigate('/asn');
      });
    }
  }, [id]);

  const handleMarkArrived = async () => {
    if (!currentASN) return;
    try {
      await markASNArrived(currentASN.id, new Date().toISOString());
      showSuccessToast('ASN marked as arrived');
    } catch (error) {
      showErrorToast('Failed to mark ASN as arrived');
    }
  };

  const handleStartReceiving = async () => {
    if (!currentASN) return;
    try {
      await startReceiving(currentASN.id);
      navigate(`/asn/${currentASN.id}/receive`);
    } catch (error) {
      showErrorToast('Failed to start receiving');
    }
  };

  const handleCancel = async () => {
    if (!currentASN) return;
    try {
      await cancelASN(currentASN.id, 'Cancelled by user');
      showSuccessToast('ASN cancelled');
      setShowCancelModal(false);
    } catch (error) {
      showErrorToast('Failed to cancel ASN');
    }
  };

  if (isLoading || !currentASN) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600" />
      </div>
    );
  }

  const lineColumns = [
    {
      key: 'lineNumber',
      header: 'Line',
      render: (line: any) => `#${line.lineNumber}`,
    },
    {
      key: 'sku',
      header: 'SKU',
      render: (line: any) => (
        <div>
          <p className="font-medium">{line.sku?.skuCode}</p>
          <p className="text-sm text-gray-500">{line.sku?.productName}</p>
        </div>
      ),
    },
    {
      key: 'expectedQuantity',
      header: 'Expected',
      render: (line: any) => `${formatNumber(line.expectedQuantity)} ${line.uom}`,
    },
    {
      key: 'receivedQuantity',
      header: 'Received',
      render: (line: any) => (
        <span
          className={
            line.receivedQuantity === line.expectedQuantity
              ? 'text-success-600 font-medium'
              : 'text-gray-900'
          }
        >
          {formatNumber(line.receivedQuantity || 0)} {line.uom}
        </span>
      ),
    },
    {
      key: 'lineStatus',
      header: 'Status',
      render: (line: any) => <StatusBadge status={line.lineStatus} />,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center space-x-2">
            <Link
              to="/asn"
              className="text-gray-400 hover:text-gray-600"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
            <h1 className="text-2xl font-bold text-gray-900">
              ASN {currentASN.asnNumber}
            </h1>
            <StatusBadge status={currentASN.shipmentStatus} />
          </div>
          <p className="mt-1 text-sm text-gray-600">
            PO: {currentASN.poNumber || 'N/A'}
          </p>
        </div>

        <div className="flex space-x-3">
          {currentASN.shipmentStatus === 'IN_TRANSIT' && (
            <Button variant="primary" onClick={handleMarkArrived}>
              Mark as Arrived
            </Button>
          )}
          {currentASN.shipmentStatus === 'ARRIVED' && (
            <Button variant="primary" onClick={handleStartReceiving}>
              Start Receiving
            </Button>
          )}
          {currentASN.shipmentStatus === 'RECEIVING' && (
            <Button
              variant="primary"
              onClick={() => navigate(`/asn/${currentASN.id}/receive`)}
            >
              Continue Receiving
            </Button>
          )}
          {currentASN.shipmentStatus !== 'COMPLETED' &&
            currentASN.shipmentStatus !== 'CANCELLED' && (
              <Button variant="danger" onClick={() => setShowCancelModal(true)}>
                Cancel ASN
              </Button>
            )}
        </div>
      </div>

      {/* Details Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* General Info */}
        <Card>
          <CardHeader title="General Information" />
          <CardBody>
            <dl className="space-y-3">
              <div>
                <dt className="text-sm text-gray-500">Supplier</dt>
                <dd className="mt-1 text-sm font-medium text-gray-900">
                  {currentASN.supplier?.name || 'N/A'}
                </dd>
              </div>
              <div>
                <dt className="text-sm text-gray-500">Carrier</dt>
                <dd className="mt-1 text-sm font-medium text-gray-900">
                  {currentASN.carrier || 'N/A'}
                </dd>
              </div>
              <div>
                <dt className="text-sm text-gray-500">Tracking Number</dt>
                <dd className="mt-1 text-sm font-medium text-gray-900">
                  {currentASN.trackingNumber || 'N/A'}
                </dd>
              </div>
              <div>
                <dt className="text-sm text-gray-500">Priority</dt>
                <dd className="mt-1">
                  <Badge status={currentASN.priority}>{currentASN.priority}</Badge>
                </dd>
              </div>
            </dl>
          </CardBody>
        </Card>

        {/* Dates */}
        <Card>
          <CardHeader title="Dates & Timeline" />
          <CardBody>
            <dl className="space-y-3">
              <div>
                <dt className="text-sm text-gray-500">Created</dt>
                <dd className="mt-1 text-sm font-medium text-gray-900">
                  {formatDateTime(currentASN.createdAt)}
                </dd>
              </div>
              <div>
                <dt className="text-sm text-gray-500">Expected Arrival</dt>
                <dd className="mt-1 text-sm font-medium text-gray-900">
                  {formatDateTime(currentASN.expectedArrivalDate)}
                </dd>
              </div>
              {currentASN.actualArrivalDate && (
                <div>
                  <dt className="text-sm text-gray-500">Actual Arrival</dt>
                  <dd className="mt-1 text-sm font-medium text-gray-900">
                    {formatDateTime(currentASN.actualArrivalDate)}
                  </dd>
                </div>
              )}
              {currentASN.completedAt && (
                <div>
                  <dt className="text-sm text-gray-500">Completed</dt>
                  <dd className="mt-1 text-sm font-medium text-gray-900">
                    {formatDateTime(currentASN.completedAt)}
                  </dd>
                </div>
              )}
            </dl>
          </CardBody>
        </Card>

        {/* Stats */}
        <Card>
          <CardHeader title="Receiving Progress" />
          <CardBody>
            <dl className="space-y-3">
              <div>
                <dt className="text-sm text-gray-500">Total Lines</dt>
                <dd className="mt-1 text-sm font-medium text-gray-900">
                  {currentASN.totalExpectedLines}
                </dd>
              </div>
              <div>
                <dt className="text-sm text-gray-500">Lines Received</dt>
                <dd className="mt-1 text-sm font-medium text-gray-900">
                  {currentASN.totalReceivedLines || 0} / {currentASN.totalExpectedLines}
                </dd>
              </div>
              <div>
                <dt className="text-sm text-gray-500">Expected Units</dt>
                <dd className="mt-1 text-sm font-medium text-gray-900">
                  {formatNumber(currentASN.totalExpectedUnits)}
                </dd>
              </div>
              <div>
                <dt className="text-sm text-gray-500">Received Units</dt>
                <dd className="mt-1 text-sm font-medium text-gray-900">
                  {formatNumber(currentASN.totalReceivedUnits || 0)} /{' '}
                  {formatNumber(currentASN.totalExpectedUnits)}
                </dd>
              </div>
            </dl>
          </CardBody>
        </Card>
      </div>

      {/* Special Instructions */}
      {currentASN.specialInstructions && (
        <Card>
          <CardHeader title="Special Instructions" />
          <CardBody>
            <p className="text-sm text-gray-700">{currentASN.specialInstructions}</p>
          </CardBody>
        </Card>
      )}

      {/* Lines Table */}
      <Card>
        <CardHeader
          title="ASN Lines"
          subtitle={`${currentASN.lines?.length || 0} lines`}
        />
        <CardBody padding="none">
          <Table
            columns={lineColumns}
            data={currentASN.lines || []}
            keyExtractor={(line) => line.id}
            emptyMessage="No lines found in this ASN"
          />
        </CardBody>
      </Card>

      {/* Cancel Modal */}
      <ConfirmModal
        isOpen={showCancelModal}
        onClose={() => setShowCancelModal(false)}
        onConfirm={handleCancel}
        title="Cancel ASN"
        message="Are you sure you want to cancel this ASN? This action cannot be undone."
        confirmText="Cancel ASN"
        variant="danger"
      />
    </div>
  );
};
