import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import putawayService from '../../services/putaway.service';
import {
  Card,
  CardHeader,
  CardBody,
  Button,
  Input,
  BarcodeInput,
  Modal,
  Badge,
  StatusBadge,
} from '../../components/ui';
import { PutawayTask } from '../../types';
import { formatNumber } from '../../utils/helpers';
import { showErrorToast, showSuccessToast } from '../../store/uiStore';

export const PutawayExecutePage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [task, setTask] = useState<PutawayTask | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [step, setStep] = useState<'verify' | 'scan_location' | 'confirm'>('verify');

  const [scannedLocation, setScannedLocation] = useState('');
  const [confirmedQuantity, setConfirmedQuantity] = useState(0);
  const [operatorNotes, setOperatorNotes] = useState('');
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [recommendedLocation, setRecommendedLocation] = useState<any>(null);

  useEffect(() => {
    if (id) {
      loadTask();
    }
  }, [id]);

  const loadTask = async () => {
    setIsLoading(true);
    try {
      const taskData = await putawayService.getPutawayTaskById(id!);
      setTask(taskData);
      setConfirmedQuantity(taskData.quantityToPutaway);

      // Load recommended location if no destination is set
      if (!taskData.destinationLocationId) {
        const location = await putawayService.getRecommendedLocation(
          taskData.skuId,
          taskData.quantityToPutaway,
          taskData.warehouseId
        );
        setRecommendedLocation(location);
      }
    } catch (error) {
      showErrorToast('Failed to load task');
      navigate('/putaway');
    } finally {
      setIsLoading(false);
    }
  };

  const handleScanLocation = (location: string) => {
    setScannedLocation(location);

    // Verify if scanned location matches recommended or assigned location
    const expectedLocation = task?.destinationLocationCode || recommendedLocation?.locationCode;

    if (expectedLocation && location !== expectedLocation) {
      showErrorToast(`Location mismatch! Expected: ${expectedLocation}`);
    } else {
      showSuccessToast('Location verified');
      setStep('confirm');
    }
  };

  const handleComplete = async () => {
    if (!task || !scannedLocation) return;

    try {
      await putawayService.completeTask(task.id, {
        destinationLocationId: task.destinationLocationId || recommendedLocation?.id,
        quantityConfirmed: confirmedQuantity,
        operatorNotes,
      });

      showSuccessToast('Putaway completed successfully');
      navigate('/putaway');
    } catch (error) {
      showErrorToast('Failed to complete putaway');
    }
  };

  const handleHold = async () => {
    if (!task) return;

    try {
      await putawayService.putOnHold(task.id, operatorNotes || 'Put on hold by operator');
      showSuccessToast('Task put on hold');
      navigate('/putaway');
    } catch (error) {
      showErrorToast('Failed to put task on hold');
    }
  };

  if (isLoading || !task) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600" />
      </div>
    );
  }

  const expectedLocation = task.destinationLocationCode || recommendedLocation?.locationCode || 'TBD';

  return (
    <div className="max-w-2xl mx-auto space-y-4 p-4">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm p-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Putaway Task</h1>
            <p className="text-sm text-gray-600">{task.taskNumber}</p>
          </div>
          <StatusBadge status={task.status} />
        </div>
      </div>

      {/* Progress Indicator */}
      <div className="bg-white rounded-lg shadow-sm p-4">
        <div className="flex items-center justify-between">
          <div className={`flex-1 text-center ${step === 'verify' ? 'font-bold text-primary-600' : 'text-gray-400'}`}>
            <div className={`w-8 h-8 mx-auto rounded-full flex items-center justify-center ${step === 'verify' ? 'bg-primary-600 text-white' : 'bg-gray-200'}`}>
              1
            </div>
            <p className="text-xs mt-1">Verify</p>
          </div>
          <div className="flex-1 border-t-2 border-gray-300 mx-2"></div>
          <div className={`flex-1 text-center ${step === 'scan_location' ? 'font-bold text-primary-600' : 'text-gray-400'}`}>
            <div className={`w-8 h-8 mx-auto rounded-full flex items-center justify-center ${step === 'scan_location' ? 'bg-primary-600 text-white' : 'bg-gray-200'}`}>
              2
            </div>
            <p className="text-xs mt-1">Scan</p>
          </div>
          <div className="flex-1 border-t-2 border-gray-300 mx-2"></div>
          <div className={`flex-1 text-center ${step === 'confirm' ? 'font-bold text-primary-600' : 'text-gray-400'}`}>
            <div className={`w-8 h-8 mx-auto rounded-full flex items-center justify-center ${step === 'confirm' ? 'bg-primary-600 text-white' : 'bg-gray-200'}`}>
              3
            </div>
            <p className="text-xs mt-1">Confirm</p>
          </div>
        </div>
      </div>

      {/* Task Details */}
      <Card>
        <CardHeader title="Task Details" />
        <CardBody>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-xs text-gray-500">SKU</p>
                <p className="font-medium">{task.skuCode}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Priority</p>
                <Badge status={task.priority}>{task.priority}</Badge>
              </div>
            </div>
            <div>
              <p className="text-xs text-gray-500">Product</p>
              <p className="font-medium">{task.productName}</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-xs text-gray-500">Quantity</p>
                <p className="text-2xl font-bold text-primary-600">
                  {formatNumber(task.quantityToPutaway)}
                </p>
              </div>
              {task.lpn && (
                <div>
                  <p className="text-xs text-gray-500">LPN</p>
                  <p className="font-mono font-medium">{task.lpn}</p>
                </div>
              )}
            </div>
            {task.batchNumber && (
              <div>
                <p className="text-xs text-gray-500">Batch Number</p>
                <p className="font-medium">{task.batchNumber}</p>
              </div>
            )}
          </div>
        </CardBody>
      </Card>

      {/* Step 1: Verify Source Location */}
      {step === 'verify' && (
        <Card>
          <CardHeader title="Step 1: Verify Source Location" />
          <CardBody>
            <div className="space-y-4">
              <div className="bg-primary-50 border border-primary-200 rounded-lg p-4">
                <p className="text-sm text-gray-600">Pick from location:</p>
                <p className="text-3xl font-bold text-primary-600 font-mono mt-2">
                  {task.sourceLocationCode}
                </p>
              </div>
              <Button
                variant="primary"
                className="w-full"
                onClick={() => setStep('scan_location')}
              >
                Confirm & Continue
              </Button>
            </div>
          </CardBody>
        </Card>
      )}

      {/* Step 2: Scan Destination Location */}
      {step === 'scan_location' && (
        <Card>
          <CardHeader title="Step 2: Scan Destination Location" />
          <CardBody>
            <div className="space-y-4">
              <div className="bg-success-50 border border-success-200 rounded-lg p-4">
                <p className="text-sm text-gray-600">
                  {task.destinationLocationCode ? 'Assigned location:' : 'Recommended location:'}
                </p>
                <p className="text-3xl font-bold text-success-600 font-mono mt-2">
                  {expectedLocation}
                </p>
              </div>

              {recommendedLocation && !task.destinationLocationCode && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm">
                  <p className="font-medium text-blue-900">Location Details:</p>
                  <p className="text-blue-700">Zone: {recommendedLocation.zoneName}</p>
                  <p className="text-blue-700">Available: {recommendedLocation.availableCapacity} units</p>
                </div>
              )}

              <BarcodeInput
                onScan={handleScanLocation}
                placeholder="Scan location barcode"
                label="Destination Location"
              />

              <Button
                variant="ghost"
                className="w-full"
                onClick={() => setStep('verify')}
              >
                Back
              </Button>
            </div>
          </CardBody>
        </Card>
      )}

      {/* Step 3: Confirm Putaway */}
      {step === 'confirm' && (
        <Card>
          <CardHeader title="Step 3: Confirm Putaway" />
          <CardBody>
            <div className="space-y-4">
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-gray-600">From</p>
                    <p className="font-mono font-medium">{task.sourceLocationCode}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">To</p>
                    <p className="font-mono font-medium">{scannedLocation}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">SKU</p>
                    <p className="font-medium">{task.skuCode}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Expected Qty</p>
                    <p className="font-medium">{formatNumber(task.quantityToPutaway)}</p>
                  </div>
                </div>
              </div>

              <Input
                type="number"
                label="Confirm Quantity"
                value={confirmedQuantity}
                onChange={(e) => setConfirmedQuantity(parseInt(e.target.value) || 0)}
                required
              />

              <Input
                label="Notes (Optional)"
                value={operatorNotes}
                onChange={(e) => setOperatorNotes(e.target.value)}
                placeholder="Add any notes about this putaway..."
              />

              <div className="flex space-x-3">
                <Button
                  variant="ghost"
                  className="flex-1"
                  onClick={() => setStep('scan_location')}
                >
                  Back
                </Button>
                <Button
                  variant="primary"
                  className="flex-1"
                  onClick={() => setShowCompleteModal(true)}
                >
                  Complete Putaway
                </Button>
              </div>
            </div>
          </CardBody>
        </Card>
      )}

      {/* Actions */}
      <div className="flex space-x-3">
        <Button
          variant="warning"
          className="flex-1"
          onClick={handleHold}
        >
          Put on Hold
        </Button>
        <Button
          variant="ghost"
          className="flex-1"
          onClick={() => navigate('/putaway')}
        >
          Cancel
        </Button>
      </div>

      {/* Complete Confirmation Modal */}
      <Modal
        isOpen={showCompleteModal}
        onClose={() => setShowCompleteModal(false)}
        title="Complete Putaway?"
        size="md"
      >
        <div className="space-y-4">
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Task:</span>
                <span className="font-medium">{task.taskNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">SKU:</span>
                <span className="font-medium">{task.skuCode}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Quantity:</span>
                <span className="font-medium">{formatNumber(confirmedQuantity)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Location:</span>
                <span className="font-mono font-medium">{scannedLocation}</span>
              </div>
            </div>
          </div>

          {confirmedQuantity !== task.quantityToPutaway && (
            <div className="bg-warning-50 border border-warning-200 rounded-lg p-3">
              <p className="text-sm text-warning-800">
                ⚠️ Quantity mismatch: Expected {formatNumber(task.quantityToPutaway)} but confirming {formatNumber(confirmedQuantity)}
              </p>
            </div>
          )}

          <p className="text-sm text-gray-600">
            Are you sure you want to complete this putaway? This action cannot be undone.
          </p>

          <div className="flex justify-end space-x-3 pt-4 border-t">
            <Button
              variant="ghost"
              onClick={() => setShowCompleteModal(false)}
            >
              Cancel
            </Button>
            <Button
              variant="success"
              onClick={handleComplete}
            >
              Complete Putaway
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
