import { useEffect, useState } from 'react';
import varianceService, { VarianceQueryParams } from '../../services/variance.service';
import { Card, CardHeader, CardBody, Button, Input, Select, Table, Pagination, StatusBadge, Badge, Modal, Textarea } from '../../components/ui';
import { Variance, VarianceStatus, VarianceType, ResolutionAction } from '../../types';
import { formatDate, formatDateTime, formatNumber } from '../../utils/helpers';
import { showErrorToast, showSuccessToast } from '../../store/uiStore';

export const VarianceListPage: React.FC = () => {
  const [variances, setVariances] = useState<Variance[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(20);
  const [isLoading, setIsLoading] = useState(false);
  const [reviewModal, setReviewModal] = useState(false);
  const [selectedVariance, setSelectedVariance] = useState<Variance | null>(null);
  const [reviewData, setReviewData] = useState({
    resolutionAction: 'APPROVE' as ResolutionAction,
    supervisorNotes: '',
    adjustedQuantity: 0,
  });

  const [filters, setFilters] = useState({
    search: '',
    status: '' as VarianceStatus | '',
    varianceType: '' as VarianceType | '',
    priority: '',
  });

  useEffect(() => {
    loadVariances();
  }, [filters, currentPage]);

  const loadVariances = async () => {
    setIsLoading(true);
    try {
      const params: VarianceQueryParams = {
        search: filters.search || undefined,
        status: filters.status || undefined,
        varianceType: filters.varianceType || undefined,
        priority: filters.priority || undefined,
        page: currentPage,
        limit: pageSize,
      };
      const response = await varianceService.getVariances(params);
      setVariances(response.data);
      setTotalCount(response.pagination.total);
    } catch (error) {
      showErrorToast('Failed to load variances');
    } finally {
      setIsLoading(false);
    }
  };

  const handleReview = (variance: Variance) => {
    setSelectedVariance(variance);
    setReviewModal(true);
    setReviewData({
      resolutionAction: 'APPROVE',
      supervisorNotes: '',
      adjustedQuantity: variance.receivedQuantity,
    });
  };

  const handleSubmitReview = async () => {
    if (!selectedVariance) return;
    try {
      await varianceService.resolveVariance(selectedVariance.id, reviewData);
      showSuccessToast(`Variance ${reviewData.resolutionAction.toLowerCase()}d`);
      setReviewModal(false);
      setSelectedVariance(null);
      loadVariances();
    } catch (error) {
      showErrorToast('Failed to resolve variance');
    }
  };

  const statusOptions = [
    { value: '', label: 'All Statuses' },
    { value: 'PENDING', label: 'Pending' },
    { value: 'UNDER_REVIEW', label: 'Under Review' },
    { value: 'APPROVED', label: 'Approved' },
    { value: 'REJECTED', label: 'Rejected' },
    { value: 'ESCALATED', label: 'Escalated' },
  ];

  const typeOptions = [
    { value: '', label: 'All Types' },
    { value: 'QUANTITY', label: 'Quantity' },
    { value: 'QUALITY', label: 'Quality' },
    { value: 'DOCUMENTATION', label: 'Documentation' },
    { value: 'OTHER', label: 'Other' },
  ];

  const priorityOptions = [
    { value: '', label: 'All Priorities' },
    { value: 'LOW', label: 'Low' },
    { value: 'MEDIUM', label: 'Medium' },
    { value: 'HIGH', label: 'High' },
    { value: 'CRITICAL', label: 'Critical' },
  ];

  const columns = [
    {
      key: 'skuCode',
      header: 'SKU',
      render: (v: Variance) => <span className="font-medium">{v.skuCode}</span>,
    },
    {
      key: 'productName',
      header: 'Product',
      render: (v: Variance) => v.productName,
    },
    {
      key: 'varianceType',
      header: 'Type',
      render: (v: Variance) => <Badge status={v.varianceType}>{v.varianceType}</Badge>,
    },
    {
      key: 'variance',
      header: 'Variance',
      render: (v: Variance) => (
        <span className={v.varianceQuantity < 0 ? 'text-danger-600 font-medium' : 'text-warning-600 font-medium'}>
          {v.varianceQuantity > 0 ? '+' : ''}{formatNumber(v.varianceQuantity)} ({v.variancePercentage.toFixed(1)}%)
        </span>
      ),
    },
    {
      key: 'priority',
      header: 'Priority',
      render: (v: Variance) => <Badge status={v.priority}>{v.priority}</Badge>,
    },
    {
      key: 'status',
      header: 'Status',
      render: (v: Variance) => <StatusBadge status={v.status} />,
    },
    {
      key: 'createdAt',
      header: 'Created',
      render: (v: Variance) => formatDate(v.createdAt),
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (v: Variance) => (
        <div className="flex space-x-2">
          {v.status === 'PENDING' && (
            <Button size="sm" variant="primary" onClick={() => handleReview(v)}>
              Review
            </Button>
          )}
          <Button size="sm" variant="ghost">View</Button>
        </div>
      ),
    },
  ];

  const totalPages = Math.ceil(totalCount / pageSize);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Variance Management</h1>
        <p className="mt-1 text-sm text-gray-600">Review and resolve receiving variances</p>
      </div>

      <Card>
        <CardBody>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <Input placeholder="Search SKU or product..." value={filters.search} onChange={(e) => setFilters({...filters, search: e.target.value})} />
            <Select value={filters.status} onChange={(e) => setFilters({...filters, status: e.target.value as VarianceStatus | ''})} options={statusOptions} />
            <Select value={filters.varianceType} onChange={(e) => setFilters({...filters, varianceType: e.target.value as VarianceType | ''})} options={typeOptions} />
            <Select value={filters.priority} onChange={(e) => setFilters({...filters, priority: e.target.value})} options={priorityOptions} />
            <Button variant="ghost" onClick={() => setFilters({search: '', status: '', varianceType: '', priority: ''})}>Clear</Button>
          </div>
        </CardBody>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card><CardBody><p className="text-sm text-gray-600">Total Variances</p><p className="mt-1 text-2xl font-bold text-gray-900">{totalCount}</p></CardBody></Card>
        <Card><CardBody><p className="text-sm text-gray-600">Pending Review</p><p className="mt-1 text-2xl font-bold text-warning-600">{variances.filter(v => v.status === 'PENDING').length}</p></CardBody></Card>
        <Card><CardBody><p className="text-sm text-gray-600">Approved</p><p className="mt-1 text-2xl font-bold text-success-600">{variances.filter(v => v.status === 'APPROVED').length}</p></CardBody></Card>
        <Card><CardBody><p className="text-sm text-gray-600">Rejected</p><p className="mt-1 text-2xl font-bold text-danger-600">{variances.filter(v => v.status === 'REJECTED').length}</p></CardBody></Card>
      </div>

      <Card>
        <CardHeader title="Variances" subtitle={`${totalCount} total variances`} />
        <CardBody padding="none">
          <Table columns={columns} data={variances} keyExtractor={(v) => v.id} isLoading={isLoading} emptyMessage="No variances found" />
          {totalCount > 0 && <Pagination currentPage={currentPage} totalPages={totalPages} totalItems={totalCount} itemsPerPage={pageSize} onPageChange={setCurrentPage} />}
        </CardBody>
      </Card>

      <Modal isOpen={reviewModal} onClose={() => {setReviewModal(false); setSelectedVariance(null);}} title={`Review Variance`} size="lg">
        {selectedVariance && (
          <div className="space-y-4">
            <div className="bg-gray-50 p-4 rounded">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><p className="text-gray-600">SKU</p><p className="font-medium">{selectedVariance.skuCode}</p></div>
                <div><p className="text-gray-600">Product</p><p className="font-medium">{selectedVariance.productName}</p></div>
                <div><p className="text-gray-600">Expected</p><p className="font-medium">{formatNumber(selectedVariance.expectedQuantity || 0)}</p></div>
                <div><p className="text-gray-600">Received</p><p className="font-medium">{formatNumber(selectedVariance.receivedQuantity)}</p></div>
                <div><p className="text-gray-600">Variance</p><p className="font-medium text-danger-600">{formatNumber(selectedVariance.varianceQuantity)}</p></div>
                <div><p className="text-gray-600">Percentage</p><p className="font-medium">{selectedVariance.variancePercentage.toFixed(1)}%</p></div>
              </div>
            </div>
            {selectedVariance.receiverNotes && (
              <div className="text-sm"><p className="text-gray-600 mb-1">Receiver Notes</p><p className="bg-gray-50 p-2 rounded">{selectedVariance.receiverNotes}</p></div>
            )}
            <div>
              <label className="block text-sm font-medium mb-2">Resolution</label>
              <div className="grid grid-cols-3 gap-2">
                <button onClick={() => setReviewData({...reviewData, resolutionAction: 'APPROVE'})} className={`py-2 px-4 rounded border-2 ${reviewData.resolutionAction === 'APPROVE' ? 'border-success-600 bg-success-50 text-success-700' : 'border-gray-300'}`}>✓ Approve</button>
                <button onClick={() => setReviewData({...reviewData, resolutionAction: 'REJECT'})} className={`py-2 px-4 rounded border-2 ${reviewData.resolutionAction === 'REJECT' ? 'border-danger-600 bg-danger-50 text-danger-700' : 'border-gray-300'}`}>✕ Reject</button>
                <button onClick={() => setReviewData({...reviewData, resolutionAction: 'ESCALATE'})} className={`py-2 px-4 rounded border-2 ${reviewData.resolutionAction === 'ESCALATE' ? 'border-warning-600 bg-warning-50 text-warning-700' : 'border-gray-300'}`}>⬆ Escalate</button>
              </div>
            </div>
            {reviewData.resolutionAction === 'APPROVE' && (
              <Input type="number" label="Adjusted Quantity" value={reviewData.adjustedQuantity} onChange={(e) => setReviewData({...reviewData, adjustedQuantity: parseInt(e.target.value) || 0})} />
            )}
            <Textarea label="Supervisor Notes" value={reviewData.supervisorNotes} onChange={(e) => setReviewData({...reviewData, supervisorNotes: e.target.value})} rows={3} required />
            <div className="flex justify-end space-x-3 pt-4 border-t">
              <Button variant="ghost" onClick={() => {setReviewModal(false); setSelectedVariance(null);}}>Cancel</Button>
              <Button variant={reviewData.resolutionAction === 'APPROVE' ? 'success' : reviewData.resolutionAction === 'REJECT' ? 'danger' : 'warning'} onClick={handleSubmitReview}>{reviewData.resolutionAction}</Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
