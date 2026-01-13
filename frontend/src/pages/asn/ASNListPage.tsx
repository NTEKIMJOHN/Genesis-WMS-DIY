import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useASNStore } from '../../store';
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
} from '../../components/ui';
import { formatDate, formatDateTime } from '../../utils/helpers';
import { ShipmentStatus } from '../../types';
import { showErrorToast } from '../../store/uiStore';

export const ASNListPage: React.FC = () => {
  const navigate = useNavigate();
  const {
    asns,
    totalCount,
    currentPage,
    pageSize,
    isLoading,
    fetchASNs,
  } = useASNStore();

  // Filter state
  const [filters, setFilters] = useState({
    search: '',
    status: '' as ShipmentStatus | '',
    priority: '',
  });

  // Fetch ASNs on mount and when filters change
  useEffect(() => {
    loadASNs();
  }, [filters, currentPage]);

  const loadASNs = async () => {
    try {
      await fetchASNs({
        search: filters.search || undefined,
        status: filters.status || undefined,
        priority: filters.priority || undefined,
        page: currentPage,
        limit: pageSize,
      });
    } catch (error) {
      showErrorToast('Failed to load ASNs', 'Please try again');
    }
  };

  const handleSearch = (value: string) => {
    setFilters((prev) => ({ ...prev, search: value }));
  };

  const handleStatusFilter = (value: string) => {
    setFilters((prev) => ({ ...prev, status: value as ShipmentStatus | '' }));
  };

  const handlePriorityFilter = (value: string) => {
    setFilters((prev) => ({ ...prev, priority: value }));
  };

  const clearFilters = () => {
    setFilters({ search: '', status: '', priority: '' });
  };

  const statusOptions = [
    { value: '', label: 'All Statuses' },
    { value: 'CREATED', label: 'Created' },
    { value: 'IN_TRANSIT', label: 'In Transit' },
    { value: 'ARRIVED', label: 'Arrived' },
    { value: 'RECEIVING', label: 'Receiving' },
    { value: 'COMPLETED', label: 'Completed' },
    { value: 'CANCELLED', label: 'Cancelled' },
  ];

  const priorityOptions = [
    { value: '', label: 'All Priorities' },
    { value: 'LOW', label: 'Low' },
    { value: 'STANDARD', label: 'Standard' },
    { value: 'HIGH', label: 'High' },
    { value: 'URGENT', label: 'Urgent' },
    { value: 'CRITICAL', label: 'Critical' },
  ];

  const columns = [
    {
      key: 'asnNumber',
      header: 'ASN Number',
      render: (asn: any) => (
        <Link
          to={`/asn/${asn.id}`}
          className="font-medium text-primary-600 hover:text-primary-700"
        >
          {asn.asnNumber}
        </Link>
      ),
    },
    {
      key: 'poNumber',
      header: 'PO Number',
      render: (asn: any) => asn.poNumber || '-',
    },
    {
      key: 'supplier',
      header: 'Supplier',
      render: (asn: any) => asn.supplier?.name || '-',
    },
    {
      key: 'expectedArrivalDate',
      header: 'Expected Arrival',
      render: (asn: any) => formatDate(asn.expectedArrivalDate),
    },
    {
      key: 'priority',
      header: 'Priority',
      render: (asn: any) => <Badge status={asn.priority}>{asn.priority}</Badge>,
    },
    {
      key: 'shipmentStatus',
      header: 'Status',
      render: (asn: any) => <StatusBadge status={asn.shipmentStatus} />,
    },
    {
      key: 'totalExpectedLines',
      header: 'Lines',
      render: (asn: any) => (
        <span className="text-gray-900">
          {asn.totalReceivedLines || 0} / {asn.totalExpectedLines}
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (asn: any) => (
        <div className="flex space-x-2">
          {(asn.shipmentStatus === 'ARRIVED' ||
            asn.shipmentStatus === 'RECEIVING') && (
            <Button
              size="sm"
              variant="primary"
              onClick={(e) => {
                e.stopPropagation();
                navigate(`/asn/${asn.id}/receive`);
              }}
            >
              Receive
            </Button>
          )}
          <Button
            size="sm"
            variant="ghost"
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/asn/${asn.id}`);
            }}
          >
            View
          </Button>
        </div>
      ),
    },
  ];

  const totalPages = Math.ceil(totalCount / pageSize);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">ASN Receiving</h1>
          <p className="mt-1 text-sm text-gray-600">
            Manage Advanced Shipping Notices and receiving operations
          </p>
        </div>
        <Button variant="primary">Create ASN</Button>
      </div>

      {/* Filters */}
      <Card>
        <CardBody>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Input
              placeholder="Search ASN or PO number..."
              value={filters.search}
              onChange={(e) => handleSearch(e.target.value)}
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
              onChange={(e) => handleStatusFilter(e.target.value)}
              options={statusOptions}
            />

            <Select
              value={filters.priority}
              onChange={(e) => handlePriorityFilter(e.target.value)}
              options={priorityOptions}
            />

            <Button variant="ghost" onClick={clearFilters}>
              Clear Filters
            </Button>
          </div>
        </CardBody>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardBody>
            <p className="text-sm text-gray-600">Total ASNs</p>
            <p className="mt-1 text-2xl font-bold text-gray-900">
              {totalCount}
            </p>
          </CardBody>
        </Card>
        <Card>
          <CardBody>
            <p className="text-sm text-gray-600">Arriving Today</p>
            <p className="mt-1 text-2xl font-bold text-primary-600">
              {asns.filter((a) => a.shipmentStatus === 'ARRIVED').length}
            </p>
          </CardBody>
        </Card>
        <Card>
          <CardBody>
            <p className="text-sm text-gray-600">In Receiving</p>
            <p className="mt-1 text-2xl font-bold text-warning-600">
              {asns.filter((a) => a.shipmentStatus === 'RECEIVING').length}
            </p>
          </CardBody>
        </Card>
        <Card>
          <CardBody>
            <p className="text-sm text-gray-600">Completed</p>
            <p className="mt-1 text-2xl font-bold text-success-600">
              {asns.filter((a) => a.shipmentStatus === 'COMPLETED').length}
            </p>
          </CardBody>
        </Card>
      </div>

      {/* Table */}
      <Card>
        <CardHeader
          title="ASN Queue"
          subtitle={`${totalCount} total ASNs`}
        />
        <CardBody padding="none">
          <Table
            columns={columns}
            data={asns}
            keyExtractor={(asn) => asn.id}
            onRowClick={(asn) => navigate(`/asn/${asn.id}`)}
            isLoading={isLoading}
            emptyMessage="No ASNs found. Create your first ASN to get started."
          />

          {totalCount > 0 && (
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={totalCount}
              itemsPerPage={pageSize}
              onPageChange={(page) => {
                const store = useASNStore.getState();
                store.fetchASNs({ ...filters, page, limit: pageSize });
              }}
            />
          )}
        </CardBody>
      </Card>
    </div>
  );
};
