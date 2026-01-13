import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import lpnService, { LPNQueryParams, CreateLPNInput, MoveLPNInput, SplitLPNInput } from '../../services/lpn.service';
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
  BarcodeInput,
} from '../../components/ui';
import { LPN, LPNStatus } from '../../types';
import { formatDate, formatDateTime, formatNumber } from '../../utils/helpers';
import { showErrorToast, showSuccessToast } from '../../store/uiStore';

export const LPNListPage: React.FC = () => {
  const navigate = useNavigate();

  const [lpns, setLpns] = useState<LPN[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(20);
  const [isLoading, setIsLoading] = useState(false);

  // Modals
  const [createModal, setCreateModal] = useState(false);
  const [moveModal, setMoveModal] = useState(false);
  const [splitModal, setSplitModal] = useState(false);
  const [consolidateModal, setConsolidateModal] = useState(false);
  const [selectedLPN, setSelectedLPN] = useState<LPN | null>(null);

  // Filter state
  const [filters, setFilters] = useState({
    search: '',
    status: '' as LPNStatus | '',
    lpnType: '',
  });

  // Create LPN state
  const [newLPN, setNewLPN] = useState({
    lpnType: 'PALLET' as 'PALLET' | 'CARTON' | 'TOTE' | 'OTHER',
    skuId: '',
    quantity: 0,
    batchNumber: '',
  });

  // Move LPN state
  const [moveData, setMoveData] = useState({
    destinationLocation: '',
  });

  // Split LPN state
  const [splitData, setSplitData] = useState({
    skuId: '',
    quantity: 0,
  });

  // Consolidate LPN state
  const [consolidateData, setConsolidateData] = useState({
    sourceLPNs: [] as string[],
    targetLPN: '',
  });

  useEffect(() => {
    loadLPNs();
  }, [filters, currentPage]);

  const loadLPNs = async () => {
    setIsLoading(true);
    try {
      const params: LPNQueryParams = {
        search: filters.search || undefined,
        status: filters.status || undefined,
        lpnType: filters.lpnType || undefined,
        page: currentPage,
        limit: pageSize,
      };

      const response = await lpnService.getLPNs(params);
      setLpns(response.data);
      setTotalCount(response.pagination.total);
    } catch (error) {
      showErrorToast('Failed to load LPNs');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateLPN = async () => {
    try {
      const data: CreateLPNInput = {
        tenantId: 'default-tenant',
        warehouseId: 'default-warehouse',
        lpnType: newLPN.lpnType,
        items: [{
          skuId: newLPN.skuId,
          quantity: newLPN.quantity,
          batchNumber: newLPN.batchNumber || undefined,
        }],
      };

      await lpnService.createLPN(data);
      showSuccessToast('LPN created successfully');
      setCreateModal(false);
      setNewLPN({ lpnType: 'PALLET', skuId: '', quantity: 0, batchNumber: '' });
      loadLPNs();
    } catch (error) {
      showErrorToast('Failed to create LPN');
    }
  };

  const handleMoveLPN = async () => {
    if (!selectedLPN || !moveData.destinationLocation) return;

    try {
      // In a real system, you'd resolve location code to ID
      await lpnService.moveLPN(selectedLPN.id, {
        destinationLocationId: moveData.destinationLocation,
      });
      showSuccessToast('LPN moved successfully');
      setMoveModal(false);
      setSelectedLPN(null);
      setMoveData({ destinationLocation: '' });
      loadLPNs();
    } catch (error) {
      showErrorToast('Failed to move LPN');
    }
  };

  const handleSplitLPN = async () => {
    if (!selectedLPN || !splitData.skuId || splitData.quantity <= 0) return;

    try {
      const result = await lpnService.splitLPN(selectedLPN.id, {
        items: [{
          skuId: splitData.skuId,
          quantity: splitData.quantity,
        }],
      });
      showSuccessToast(`LPN split successfully. New LPN: ${result.newLPN.lpnCode}`);
      setSplitModal(false);
      setSelectedLPN(null);
      setSplitData({ skuId: '', quantity: 0 });
      loadLPNs();
    } catch (error) {
      showErrorToast('Failed to split LPN');
    }
  };

  const handleConsolidate = async () => {
    if (!consolidateData.targetLPN || consolidateData.sourceLPNs.length === 0) return;

    try {
      await lpnService.consolidateLPNs(
        consolidateData.targetLPN,
        consolidateData.sourceLPNs
      );
      showSuccessToast(`${consolidateData.sourceLPNs.length} LPNs consolidated`);
      setConsolidateModal(false);
      setConsolidateData({ sourceLPNs: [], targetLPN: '' });
      loadLPNs();
    } catch (error) {
      showErrorToast('Failed to consolidate LPNs');
    }
  };

  const handleGenerateLabel = async (lpn: LPN) => {
    try {
      const labelData = await lpnService.generateLabel(lpn.id);
      showSuccessToast('Label data generated. Check console for QR data.');
      console.log('Label Data:', labelData);
      // In a real system, this would trigger label printing
    } catch (error) {
      showErrorToast('Failed to generate label');
    }
  };

  const statusOptions = [
    { value: '', label: 'All Statuses' },
    { value: 'RECEIVING', label: 'Receiving' },
    { value: 'AVAILABLE', label: 'Available' },
    { value: 'ALLOCATED', label: 'Allocated' },
    { value: 'PICKED', label: 'Picked' },
    { value: 'SHIPPED', label: 'Shipped' },
    { value: 'ARCHIVED', label: 'Archived' },
  ];

  const typeOptions = [
    { value: '', label: 'All Types' },
    { value: 'PALLET', label: 'Pallet' },
    { value: 'CARTON', label: 'Carton' },
    { value: 'TOTE', label: 'Tote' },
    { value: 'OTHER', label: 'Other' },
  ];

  const columns = [
    {
      key: 'lpnCode',
      header: 'LPN Code',
      render: (lpn: LPN) => (
        <span className="font-medium font-mono text-primary-600">{lpn.lpnCode}</span>
      ),
    },
    {
      key: 'lpnType',
      header: 'Type',
      render: (lpn: LPN) => <Badge status={lpn.lpnType}>{lpn.lpnType}</Badge>,
    },
    {
      key: 'location',
      header: 'Location',
      render: (lpn: LPN) => (
        <span className="font-mono text-sm">
          {lpn.currentLocationId || 'N/A'}
        </span>
      ),
    },
    {
      key: 'units',
      header: 'Total Units',
      render: (lpn: LPN) => formatNumber(lpn.totalUnits),
    },
    {
      key: 'mixed',
      header: 'Contents',
      render: (lpn: LPN) => (
        <div className="flex flex-wrap gap-1">
          {lpn.isMixedSku && <Badge status="warning">Mixed</Badge>}
          {lpn.containsBatchTracked && <Badge status="info">Batch</Badge>}
          {lpn.containsSerialized && <Badge status="info">Serial</Badge>}
          {lpn.containsHazmat && <Badge status="danger">Hazmat</Badge>}
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (lpn: LPN) => <StatusBadge status={lpn.status} />,
    },
    {
      key: 'createdAt',
      header: 'Created',
      render: (lpn: LPN) => formatDate(lpn.createdAt),
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (lpn: LPN) => (
        <div className="flex space-x-1">
          <Button
            size="sm"
            variant="ghost"
            onClick={(e) => {
              e.stopPropagation();
              setSelectedLPN(lpn);
              setMoveModal(true);
            }}
          >
            Move
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={(e) => {
              e.stopPropagation();
              setSelectedLPN(lpn);
              setSplitModal(true);
            }}
          >
            Split
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={(e) => {
              e.stopPropagation();
              handleGenerateLabel(lpn);
            }}
          >
            Label
          </Button>
        </div>
      ),
    },
  ];

  const totalPages = Math.ceil(totalCount / pageSize);

  const receivingCount = lpns.filter((l) => l.status === 'RECEIVING').length;
  const availableCount = lpns.filter((l) => l.status === 'AVAILABLE').length;
  const allocatedCount = lpns.filter((l) => l.status === 'ALLOCATED').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">LPN Management</h1>
          <p className="mt-1 text-sm text-gray-600">
            Manage License Plate Numbers and container tracking
          </p>
        </div>
        <div className="flex space-x-3">
          <Button variant="ghost" onClick={() => setConsolidateModal(true)}>
            Consolidate
          </Button>
          <Button variant="primary" onClick={() => setCreateModal(true)}>
            Create LPN
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardBody>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Input
              placeholder="Search LPN code..."
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
                  status: e.target.value as LPNStatus | '',
                }))
              }
              options={statusOptions}
            />

            <Select
              value={filters.lpnType}
              onChange={(e) =>
                setFilters((prev) => ({ ...prev, lpnType: e.target.value }))
              }
              options={typeOptions}
            />

            <Button
              variant="ghost"
              onClick={() =>
                setFilters({ search: '', status: '', lpnType: '' })
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
            <p className="text-sm text-gray-600">Total LPNs</p>
            <p className="mt-1 text-2xl font-bold text-gray-900">{totalCount}</p>
          </CardBody>
        </Card>
        <Card>
          <CardBody>
            <p className="text-sm text-gray-600">Receiving</p>
            <p className="mt-1 text-2xl font-bold text-warning-600">{receivingCount}</p>
          </CardBody>
        </Card>
        <Card>
          <CardBody>
            <p className="text-sm text-gray-600">Available</p>
            <p className="mt-1 text-2xl font-bold text-success-600">{availableCount}</p>
          </CardBody>
        </Card>
        <Card>
          <CardBody>
            <p className="text-sm text-gray-600">Allocated</p>
            <p className="mt-1 text-2xl font-bold text-primary-600">{allocatedCount}</p>
          </CardBody>
        </Card>
      </div>

      {/* Table */}
      <Card>
        <CardHeader
          title="LPN Inventory"
          subtitle={`${totalCount} total LPNs`}
        />
        <CardBody padding="none">
          <Table
            columns={columns}
            data={lpns}
            keyExtractor={(lpn) => lpn.id}
            onRowClick={(lpn) => navigate(`/lpn/${lpn.id}`)}
            isLoading={isLoading}
            emptyMessage="No LPNs found."
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

      {/* Create LPN Modal */}
      <Modal
        isOpen={createModal}
        onClose={() => setCreateModal(false)}
        title="Create New LPN"
        size="md"
      >
        <div className="space-y-4">
          <Select
            label="LPN Type"
            value={newLPN.lpnType}
            onChange={(e) =>
              setNewLPN({
                ...newLPN,
                lpnType: e.target.value as 'PALLET' | 'CARTON' | 'TOTE' | 'OTHER',
              })
            }
            options={[
              { value: 'PALLET', label: 'Pallet' },
              { value: 'CARTON', label: 'Carton' },
              { value: 'TOTE', label: 'Tote' },
              { value: 'OTHER', label: 'Other' },
            ]}
          />

          <Input
            label="SKU ID"
            value={newLPN.skuId}
            onChange={(e) => setNewLPN({ ...newLPN, skuId: e.target.value })}
            placeholder="Enter SKU ID"
          />

          <Input
            type="number"
            label="Quantity"
            value={newLPN.quantity}
            onChange={(e) =>
              setNewLPN({ ...newLPN, quantity: parseInt(e.target.value) || 0 })
            }
          />

          <Input
            label="Batch Number (Optional)"
            value={newLPN.batchNumber}
            onChange={(e) => setNewLPN({ ...newLPN, batchNumber: e.target.value })}
          />

          <div className="flex justify-end space-x-3 pt-4 border-t">
            <Button variant="ghost" onClick={() => setCreateModal(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleCreateLPN}>
              Create LPN
            </Button>
          </div>
        </div>
      </Modal>

      {/* Move LPN Modal */}
      <Modal
        isOpen={moveModal}
        onClose={() => {
          setMoveModal(false);
          setSelectedLPN(null);
        }}
        title={`Move LPN ${selectedLPN?.lpnCode}`}
        size="md"
      >
        {selectedLPN && (
          <div className="space-y-4">
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-sm text-gray-600">Current Location:</p>
              <p className="font-mono font-medium">
                {selectedLPN.currentLocationId || 'N/A'}
              </p>
            </div>

            <BarcodeInput
              onScan={(location) => setMoveData({ destinationLocation: location })}
              placeholder="Scan destination location"
              label="Destination Location"
            />

            <div className="flex justify-end space-x-3 pt-4 border-t">
              <Button
                variant="ghost"
                onClick={() => {
                  setMoveModal(false);
                  setSelectedLPN(null);
                }}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={handleMoveLPN}
                disabled={!moveData.destinationLocation}
              >
                Move LPN
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Split LPN Modal */}
      <Modal
        isOpen={splitModal}
        onClose={() => {
          setSplitModal(false);
          setSelectedLPN(null);
        }}
        title={`Split LPN ${selectedLPN?.lpnCode}`}
        size="md"
      >
        {selectedLPN && (
          <div className="space-y-4">
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-sm text-gray-600">Current Units:</p>
              <p className="text-2xl font-bold">{formatNumber(selectedLPN.totalUnits)}</p>
            </div>

            <Input
              label="SKU ID"
              value={splitData.skuId}
              onChange={(e) => setSplitData({ ...splitData, skuId: e.target.value })}
              placeholder="SKU to split off"
            />

            <Input
              type="number"
              label="Quantity to Split"
              value={splitData.quantity}
              onChange={(e) =>
                setSplitData({ ...splitData, quantity: parseInt(e.target.value) || 0 })
              }
            />

            <p className="text-xs text-gray-500">
              This will create a new LPN with the specified quantity and SKU.
            </p>

            <div className="flex justify-end space-x-3 pt-4 border-t">
              <Button
                variant="ghost"
                onClick={() => {
                  setSplitModal(false);
                  setSelectedLPN(null);
                }}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={handleSplitLPN}
                disabled={!splitData.skuId || splitData.quantity <= 0}
              >
                Split LPN
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Consolidate LPNs Modal */}
      <Modal
        isOpen={consolidateModal}
        onClose={() => setConsolidateModal(false)}
        title="Consolidate LPNs"
        size="md"
      >
        <div className="space-y-4">
          <BarcodeInput
            onScan={(lpn) => setConsolidateData({ ...consolidateData, targetLPN: lpn })}
            placeholder="Scan target LPN"
            label="Target LPN"
          />

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Source LPNs (scan multiple)
            </label>
            <BarcodeInput
              onScan={(lpn) => {
                if (!consolidateData.sourceLPNs.includes(lpn)) {
                  setConsolidateData({
                    ...consolidateData,
                    sourceLPNs: [...consolidateData.sourceLPNs, lpn],
                  });
                }
              }}
              placeholder="Scan source LPNs"
            />
            {consolidateData.sourceLPNs.length > 0 && (
              <div className="mt-2 space-y-1">
                {consolidateData.sourceLPNs.map((lpn, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between bg-gray-50 p-2 rounded"
                  >
                    <span className="font-mono text-sm">{lpn}</span>
                    <button
                      onClick={() => {
                        setConsolidateData({
                          ...consolidateData,
                          sourceLPNs: consolidateData.sourceLPNs.filter(
                            (_, i) => i !== index
                          ),
                        });
                      }}
                      className="text-danger-600 hover:text-danger-700"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex justify-end space-x-3 pt-4 border-t">
            <Button variant="ghost" onClick={() => setConsolidateModal(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleConsolidate}
              disabled={
                !consolidateData.targetLPN || consolidateData.sourceLPNs.length === 0
              }
            >
              Consolidate {consolidateData.sourceLPNs.length} LPN
              {consolidateData.sourceLPNs.length !== 1 ? 's' : ''}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
