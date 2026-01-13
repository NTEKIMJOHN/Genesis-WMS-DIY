import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store';
import blindReceiptService, {
  BlindReceiptQueryParams,
} from '../../services/blindReceipt.service';
import {
  Card,
  CardHeader,
  CardBody,
  Button,
  Input,
  Select,
  Table,
  Pagination,
  StatusBadge,
  Badge,
  Modal,
  Textarea,
} from '../../components/ui';
import { formatDate, formatDateTime } from '../../utils/helpers';
import { BlindReceipt, BlindReceiptStatus } from '../../types';
import { showErrorToast, showSuccessToast } from '../../store/uiStore';

export const BlindReceiptListPage: React.FC = () => {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);

  const [receipts, setReceipts] = useState<BlindReceipt[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(20);
  const [isLoading, setIsLoading] = useState(false);

  // Review modal state
  const [reviewModal, setReviewModal] = useState(false);
  const [selectedReceipt, setSelectedReceipt] = useState<BlindReceipt | null>(null);
  const [reviewData, setReviewData] = useState({
    approved: true,
    supervisorNotes: '',
    rejectionReason: '',
  });

  // Filter state
  const [filters, setFilters] = useState({
    search: '',
    status: '' as BlindReceiptStatus | '',
    receiptType: '',
  });

  useEffect(() => {
    loadReceipts();
  }, [filters, currentPage]);

  const loadReceipts = async () => {
    setIsLoading(true);
    try {
      const params: BlindReceiptQueryParams = {
        search: filters.search || undefined,
        status: filters.status || undefined,
        receiptType: filters.receiptType || undefined,
        page: currentPage,
        limit: pageSize,
      };

      const response = await blindReceiptService.getBlindReceipts(params);
      setReceipts(response.data);
      setTotalCount(response.pagination.total);
    } catch (error) {
      showErrorToast('Failed to load blind receipts');
    } finally {
      setIsLoading(false);
    }
  };

  const handleReview = (receipt: BlindReceipt) => {
    setSelectedReceipt(receipt);
    setReviewModal(true);
    setReviewData({
      approved: true,
      supervisorNotes: '',
      rejectionReason: '',
    });
  };

  const handleSubmitReview = async () => {
    if (!selectedReceipt) return;

    try {
      await blindReceiptService.reviewBlindReceipt(selectedReceipt.id, reviewData);
      showSuccessToast(
        reviewData.approved ? 'Receipt approved' : 'Receipt rejected'
      );
      setReviewModal(false);
      setSelectedReceipt(null);
      loadReceipts();
    } catch (error) {
      showErrorToast('Failed to review receipt');
    }
  };

  const statusOptions = [
    { value: '', label: 'All Statuses' },
    { value: 'DRAFT', label: 'Draft' },
    { value: 'PENDING_APPROVAL', label: 'Pending Approval' },
    { value: 'APPROVED', label: 'Approved' },
    { value: 'REJECTED', label: 'Rejected' },
    { value: 'CANCELLED', label: 'Cancelled' },
  ];

  const typeOptions = [
    { value: '', label: 'All Types' },
    { value: 'UNPLANNED_DELIVERY', label: 'Unplanned Delivery' },
    { value: 'SAMPLE', label: 'Sample' },
    { value: 'RETURN', label: 'Return' },
    { value: 'OTHER', label: 'Other' },
  ];

  const columns = [
    {
      key: 'receiptNumber',
      header: 'Receipt Number',
      render: (receipt: BlindReceipt) => (
        <span className="font-medium text-primary-600">
          {receipt.receiptNumber}
        </span>
      ),
    },
    {
      key: 'receiptType',
      header: 'Type',
      render: (receipt: BlindReceipt) => (
        <Badge status={receipt.receiptType}>{receipt.receiptType.replace(/_/g, ' ')}</Badge>
      ),
    },
    {
      key: 'supplierName',
      header: 'Supplier',
      render: (receipt: BlindReceipt) => receipt.supplierName,
    },
    {
      key: 'arrivalDate',
      header: 'Arrival Date',
      render: (receipt: BlindReceipt) => formatDate(receipt.arrivalDate),
    },
    {
      key: 'totalLines',
      header: 'Lines',
      render: (receipt: BlindReceipt) => receipt.totalLines,
    },
    {
      key: 'totalUnits',
      header: 'Units',
      render: (receipt: BlindReceipt) => receipt.totalUnits,
    },
    {
      key: 'status',
      header: 'Status',
      render: (receipt: BlindReceipt) => <StatusBadge status={receipt.status} />,
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (receipt: BlindReceipt) => (
        <div className="flex space-x-2">
          {receipt.status === 'PENDING_APPROVAL' &&
            (user?.role === 'RECEIVING_SUPERVISOR' ||
              user?.role === 'WAREHOUSE_MANAGER') && (
              <Button
                size="sm"
                variant="primary"
                onClick={(e) => {
                  e.stopPropagation();
                  handleReview(receipt);
                }}
              >
                Review
              </Button>
            )}
          {receipt.status === 'DRAFT' && (
            <Button
              size="sm"
              variant="primary"
              onClick={(e) => {
                e.stopPropagation();
                navigate(`/blind-receipts/${receipt.id}/edit`);
              }}
            >
              Continue
            </Button>
          )}
          <Button
            size="sm"
            variant="ghost"
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/blind-receipts/${receipt.id}`);
            }}
          >
            View
          </Button>
        </div>
      ),
    },
  ];

  const totalPages = Math.ceil(totalCount / pageSize);

  const pendingApprovalCount = receipts.filter(
    (r) => r.status === 'PENDING_APPROVAL'
  ).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Blind Receipts</h1>
          <p className="mt-1 text-sm text-gray-600">
            Manage unplanned deliveries and blind receipts
          </p>
        </div>
        <Link to="/blind-receipts/create">
          <Button variant="primary">Create Blind Receipt</Button>
        </Link>
      </div>

      {/* Filters */}
      <Card>
        <CardBody>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Input
              placeholder="Search receipt number or supplier..."
              value={filters.search}
              onChange={(e) =>
                setFilters((prev) => ({ ...prev, search: e.target.value }))
              }
              leftIcon={
                <svg
                  className="h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
              }
            />

            <Select
              value={filters.status}
              onChange={(e) =>
                setFilters((prev) => ({
                  ...prev,
                  status: e.target.value as BlindReceiptStatus | '',
                }))
              }
              options={statusOptions}
            />

            <Select
              value={filters.receiptType}
              onChange={(e) =>
                setFilters((prev) => ({ ...prev, receiptType: e.target.value }))
              }
              options={typeOptions}
            />

            <Button
              variant="ghost"
              onClick={() =>
                setFilters({ search: '', status: '', receiptType: '' })
              }
            >
              Clear Filters
            </Button>
          </div>
        </CardBody>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardBody>
            <p className="text-sm text-gray-600">Total Receipts</p>
            <p className="mt-1 text-2xl font-bold text-gray-900">{totalCount}</p>
          </CardBody>
        </Card>
        <Card>
          <CardBody>
            <p className="text-sm text-gray-600">Pending Approval</p>
            <p className="mt-1 text-2xl font-bold text-warning-600">
              {pendingApprovalCount}
            </p>
          </CardBody>
        </Card>
        <Card>
          <CardBody>
            <p className="text-sm text-gray-600">Approved</p>
            <p className="mt-1 text-2xl font-bold text-success-600">
              {receipts.filter((r) => r.status === 'APPROVED').length}
            </p>
          </CardBody>
        </Card>
        <Card>
          <CardBody>
            <p className="text-sm text-gray-600">Rejected</p>
            <p className="mt-1 text-2xl font-bold text-danger-600">
              {receipts.filter((r) => r.status === 'REJECTED').length}
            </p>
          </CardBody>
        </Card>
      </div>

      {/* Table */}
      <Card>
        <CardHeader
          title="Blind Receipts"
          subtitle={`${totalCount} total receipts`}
        />
        <CardBody padding="none">
          <Table
            columns={columns}
            data={receipts}
            keyExtractor={(receipt) => receipt.id}
            isLoading={isLoading}
            emptyMessage="No blind receipts found. Create your first receipt to get started."
          />

          {totalCount > 0 && (
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={totalCount}
              itemsPerPage={pageSize}
              onPageChange={setCurrentPage}
            />
          )}
        </CardBody>
      </Card>

      {/* Review Modal */}
      <Modal
        isOpen={reviewModal}
        onClose={() => {
          setReviewModal(false);
          setSelectedReceipt(null);
        }}
        title={`Review Blind Receipt ${selectedReceipt?.receiptNumber}`}
        size="lg"
      >
        {selectedReceipt && (
          <div className="space-y-4">
            {/* Receipt Info */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500">Supplier</p>
                  <p className="font-medium">{selectedReceipt.supplierName}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Type</p>
                  <p className="font-medium">
                    {selectedReceipt.receiptType.replace(/_/g, ' ')}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Arrival Date</p>
                  <p className="font-medium">
                    {formatDateTime(selectedReceipt.arrivalDate)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Total Lines/Units</p>
                  <p className="font-medium">
                    {selectedReceipt.totalLines} lines / {selectedReceipt.totalUnits}{' '}
                    units
                  </p>
                </div>
              </div>
            </div>

            {/* Lines Summary */}
            {selectedReceipt.lines && selectedReceipt.lines.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-gray-900 mb-2">
                  Receipt Lines
                </h4>
                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">
                          SKU
                        </th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">
                          Product
                        </th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">
                          Quantity
                        </th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">
                          Condition
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {selectedReceipt.lines.map((line, index) => (
                        <tr key={index}>
                          <td className="px-4 py-2 text-sm">{line.skuCode}</td>
                          <td className="px-4 py-2 text-sm">{line.productName}</td>
                          <td className="px-4 py-2 text-sm">
                            {line.quantityReceived} {line.uom}
                          </td>
                          <td className="px-4 py-2 text-sm">
                            <Badge status={line.condition}>{line.condition}</Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Special Notes */}
            {selectedReceipt.specialNotes && (
              <div>
                <p className="text-sm text-gray-500 mb-1">Special Notes</p>
                <p className="text-sm text-gray-700 bg-gray-50 p-3 rounded">
                  {selectedReceipt.specialNotes}
                </p>
              </div>
            )}

            {/* Decision */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Decision
              </label>
              <div className="flex space-x-4">
                <button
                  onClick={() =>
                    setReviewData((prev) => ({ ...prev, approved: true }))
                  }
                  className={`flex-1 py-2 px-4 rounded-lg border-2 transition-colors ${
                    reviewData.approved
                      ? 'border-success-600 bg-success-50 text-success-700'
                      : 'border-gray-300 bg-white text-gray-700'
                  }`}
                >
                  ✓ Approve
                </button>
                <button
                  onClick={() =>
                    setReviewData((prev) => ({ ...prev, approved: false }))
                  }
                  className={`flex-1 py-2 px-4 rounded-lg border-2 transition-colors ${
                    !reviewData.approved
                      ? 'border-danger-600 bg-danger-50 text-danger-700'
                      : 'border-gray-300 bg-white text-gray-700'
                  }`}
                >
                  ✕ Reject
                </button>
              </div>
            </div>

            {/* Notes */}
            {reviewData.approved ? (
              <Textarea
                label="Supervisor Notes (Optional)"
                value={reviewData.supervisorNotes}
                onChange={(e) =>
                  setReviewData((prev) => ({
                    ...prev,
                    supervisorNotes: e.target.value,
                  }))
                }
                rows={3}
                placeholder="Add any notes about this approval..."
              />
            ) : (
              <Textarea
                label="Rejection Reason"
                value={reviewData.rejectionReason}
                onChange={(e) =>
                  setReviewData((prev) => ({
                    ...prev,
                    rejectionReason: e.target.value,
                  }))
                }
                rows={3}
                placeholder="Explain why this receipt is being rejected..."
                required
              />
            )}

            {/* Actions */}
            <div className="flex justify-end space-x-3 pt-4 border-t">
              <Button
                variant="ghost"
                onClick={() => {
                  setReviewModal(false);
                  setSelectedReceipt(null);
                }}
              >
                Cancel
              </Button>
              <Button
                variant={reviewData.approved ? 'success' : 'danger'}
                onClick={handleSubmitReview}
              >
                {reviewData.approved ? 'Approve Receipt' : 'Reject Receipt'}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
