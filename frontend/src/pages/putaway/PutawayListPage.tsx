import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store';
import putawayService, { PutawayQueryParams } from '../../services/putaway.service';
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
} from '../../components/ui';
import { PutawayTask, PutawayStatus } from '../../types';
import { formatDate, formatDateTime, formatNumber } from '../../utils/helpers';
import { showErrorToast, showSuccessToast } from '../../store/uiStore';

export const PutawayListPage: React.FC = () => {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);

  const [tasks, setTasks] = useState<PutawayTask[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(20);
  const [isLoading, setIsLoading] = useState(false);

  // Assignment modal state
  const [assignModal, setAssignModal] = useState(false);
  const [selectedTasks, setSelectedTasks] = useState<string[]>([]);
  const [operatorUserId, setOperatorUserId] = useState('');

  // Filter state
  const [filters, setFilters] = useState({
    search: '',
    status: '' as PutawayStatus | '',
    priority: '',
    taskType: '',
  });

  useEffect(() => {
    loadTasks();
  }, [filters, currentPage]);

  const loadTasks = async () => {
    setIsLoading(true);
    try {
      const params: PutawayQueryParams = {
        status: filters.status || undefined,
        priority: filters.priority || undefined,
        taskType: filters.taskType || undefined,
        page: currentPage,
        limit: pageSize,
      };

      const response = await putawayService.getPutawayTasks(params);
      setTasks(response.data);
      setTotalCount(response.pagination.total);
    } catch (error) {
      showErrorToast('Failed to load putaway tasks');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAssignTask = async (taskId: string, userId: string) => {
    try {
      await putawayService.assignTask(taskId, { operatorUserId: userId });
      showSuccessToast('Task assigned successfully');
      loadTasks();
    } catch (error) {
      showErrorToast('Failed to assign task');
    }
  };

  const handleBulkAssign = async () => {
    if (!operatorUserId || selectedTasks.length === 0) {
      showErrorToast('Please select tasks and operator');
      return;
    }

    try {
      await putawayService.batchAssign(selectedTasks, operatorUserId);
      showSuccessToast(`${selectedTasks.length} tasks assigned successfully`);
      setAssignModal(false);
      setSelectedTasks([]);
      setOperatorUserId('');
      loadTasks();
    } catch (error) {
      showErrorToast('Failed to assign tasks');
    }
  };

  const handleStartTask = async (taskId: string) => {
    try {
      await putawayService.startTask(taskId);
      navigate(`/putaway/${taskId}/execute`);
    } catch (error) {
      showErrorToast('Failed to start task');
    }
  };

  const handleCancelTask = async (taskId: string) => {
    try {
      await putawayService.cancelTask(taskId, 'Cancelled by supervisor');
      showSuccessToast('Task cancelled');
      loadTasks();
    } catch (error) {
      showErrorToast('Failed to cancel task');
    }
  };

  const statusOptions = [
    { value: '', label: 'All Statuses' },
    { value: 'PENDING', label: 'Pending' },
    { value: 'ASSIGNED', label: 'Assigned' },
    { value: 'IN_PROGRESS', label: 'In Progress' },
    { value: 'COMPLETED', label: 'Completed' },
    { value: 'CANCELLED', label: 'Cancelled' },
    { value: 'ON_HOLD', label: 'On Hold' },
  ];

  const priorityOptions = [
    { value: '', label: 'All Priorities' },
    { value: 'LOW', label: 'Low' },
    { value: 'NORMAL', label: 'Normal' },
    { value: 'HIGH', label: 'High' },
    { value: 'URGENT', label: 'Urgent' },
  ];

  const typeOptions = [
    { value: '', label: 'All Types' },
    { value: 'STANDARD', label: 'Standard' },
    { value: 'BATCH', label: 'Batch' },
    { value: 'BULK', label: 'Bulk' },
  ];

  const columns = [
    {
      key: 'select',
      header: (
        <input
          type="checkbox"
          checked={selectedTasks.length === tasks.length && tasks.length > 0}
          onChange={(e) => {
            if (e.target.checked) {
              setSelectedTasks(tasks.filter((t) => t.status === 'PENDING').map((t) => t.id));
            } else {
              setSelectedTasks([]);
            }
          }}
        />
      ),
      render: (task: PutawayTask) =>
        task.status === 'PENDING' ? (
          <input
            type="checkbox"
            checked={selectedTasks.includes(task.id)}
            onChange={(e) => {
              if (e.target.checked) {
                setSelectedTasks([...selectedTasks, task.id]);
              } else {
                setSelectedTasks(selectedTasks.filter((id) => id !== task.id));
              }
            }}
          />
        ) : null,
    },
    {
      key: 'taskNumber',
      header: 'Task Number',
      render: (task: PutawayTask) => (
        <span className="font-medium text-primary-600">{task.taskNumber}</span>
      ),
    },
    {
      key: 'sku',
      header: 'SKU',
      render: (task: PutawayTask) => (
        <div>
          <p className="font-medium">{task.skuCode}</p>
          <p className="text-sm text-gray-500">{task.productName}</p>
        </div>
      ),
    },
    {
      key: 'quantity',
      header: 'Quantity',
      render: (task: PutawayTask) => formatNumber(task.quantityToPutaway),
    },
    {
      key: 'source',
      header: 'From',
      render: (task: PutawayTask) => (
        <span className="font-mono text-sm">{task.sourceLocationCode}</span>
      ),
    },
    {
      key: 'destination',
      header: 'To',
      render: (task: PutawayTask) => (
        <span className="font-mono text-sm">
          {task.destinationLocationCode || 'TBD'}
        </span>
      ),
    },
    {
      key: 'priority',
      header: 'Priority',
      render: (task: PutawayTask) => <Badge status={task.priority}>{task.priority}</Badge>,
    },
    {
      key: 'status',
      header: 'Status',
      render: (task: PutawayTask) => <StatusBadge status={task.status} />,
    },
    {
      key: 'createdAt',
      header: 'Created',
      render: (task: PutawayTask) => formatDate(task.createdAt),
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (task: PutawayTask) => (
        <div className="flex space-x-2">
          {task.status === 'PENDING' &&
            (user?.role === 'RECEIVING_SUPERVISOR' ||
              user?.role === 'WAREHOUSE_MANAGER') && (
              <Button
                size="sm"
                variant="primary"
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedTasks([task.id]);
                  setAssignModal(true);
                }}
              >
                Assign
              </Button>
            )}
          {task.status === 'ASSIGNED' && task.operatorUserId === user?.id && (
            <Button
              size="sm"
              variant="primary"
              onClick={(e) => {
                e.stopPropagation();
                handleStartTask(task.id);
              }}
            >
              Start
            </Button>
          )}
          {task.status === 'IN_PROGRESS' && task.operatorUserId === user?.id && (
            <Button
              size="sm"
              variant="primary"
              onClick={(e) => {
                e.stopPropagation();
                navigate(`/putaway/${task.id}/execute`);
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
              navigate(`/putaway/${task.id}`);
            }}
          >
            View
          </Button>
        </div>
      ),
    },
  ];

  const totalPages = Math.ceil(totalCount / pageSize);

  const pendingCount = tasks.filter((t) => t.status === 'PENDING').length;
  const assignedCount = tasks.filter((t) => t.status === 'ASSIGNED').length;
  const inProgressCount = tasks.filter((t) => t.status === 'IN_PROGRESS').length;
  const completedCount = tasks.filter((t) => t.status === 'COMPLETED').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Putaway Tasks</h1>
          <p className="mt-1 text-sm text-gray-600">
            Manage putaway operations and task assignments
          </p>
        </div>
        {selectedTasks.length > 0 && (
          <Button variant="primary" onClick={() => setAssignModal(true)}>
            Assign {selectedTasks.length} Task{selectedTasks.length > 1 ? 's' : ''}
          </Button>
        )}
      </div>

      {/* Filters */}
      <Card>
        <CardBody>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <Input
              placeholder="Search task number or SKU..."
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
                  status: e.target.value as PutawayStatus | '',
                }))
              }
              options={statusOptions}
            />

            <Select
              value={filters.priority}
              onChange={(e) =>
                setFilters((prev) => ({ ...prev, priority: e.target.value }))
              }
              options={priorityOptions}
            />

            <Select
              value={filters.taskType}
              onChange={(e) =>
                setFilters((prev) => ({ ...prev, taskType: e.target.value }))
              }
              options={typeOptions}
            />

            <Button
              variant="ghost"
              onClick={() =>
                setFilters({ search: '', status: '', priority: '', taskType: '' })
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
            <p className="text-sm text-gray-600">Pending</p>
            <p className="mt-1 text-2xl font-bold text-gray-900">{pendingCount}</p>
          </CardBody>
        </Card>
        <Card>
          <CardBody>
            <p className="text-sm text-gray-600">Assigned</p>
            <p className="mt-1 text-2xl font-bold text-primary-600">{assignedCount}</p>
          </CardBody>
        </Card>
        <Card>
          <CardBody>
            <p className="text-sm text-gray-600">In Progress</p>
            <p className="mt-1 text-2xl font-bold text-warning-600">{inProgressCount}</p>
          </CardBody>
        </Card>
        <Card>
          <CardBody>
            <p className="text-sm text-gray-600">Completed</p>
            <p className="mt-1 text-2xl font-bold text-success-600">{completedCount}</p>
          </CardBody>
        </Card>
      </div>

      {/* Table */}
      <Card>
        <CardHeader
          title="Putaway Queue"
          subtitle={`${totalCount} total tasks`}
        />
        <CardBody padding="none">
          <Table
            columns={columns}
            data={tasks}
            keyExtractor={(task) => task.id}
            onRowClick={(task) => navigate(`/putaway/${task.id}`)}
            isLoading={isLoading}
            emptyMessage="No putaway tasks found."
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

      {/* Assignment Modal */}
      <Modal
        isOpen={assignModal}
        onClose={() => {
          setAssignModal(false);
          setOperatorUserId('');
        }}
        title={`Assign ${selectedTasks.length} Task${selectedTasks.length > 1 ? 's' : ''}`}
        size="md"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Operator
            </label>
            <Input
              type="text"
              placeholder="Enter operator user ID"
              value={operatorUserId}
              onChange={(e) => setOperatorUserId(e.target.value)}
            />
            <p className="mt-1 text-xs text-gray-500">
              In a production system, this would be a searchable dropdown
            </p>
          </div>

          <div className="flex justify-end space-x-3 pt-4 border-t">
            <Button
              variant="ghost"
              onClick={() => {
                setAssignModal(false);
                setOperatorUserId('');
              }}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleBulkAssign}
              disabled={!operatorUserId}
            >
              Assign Tasks
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
