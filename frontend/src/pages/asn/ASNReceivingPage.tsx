import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useASNStore } from '../../store';
import {
  Card,
  CardHeader,
  CardBody,
  Button,
  Input,
  Textarea,
  Select,
  Modal,
  BarcodeInput,
  FileUpload,
  StatusBadge,
} from '../../components/ui';
import { formatNumber } from '../../utils/helpers';
import { showErrorToast, showSuccessToast } from '../../store/uiStore';
import { ItemCondition } from '../../types';

export const ASNReceivingPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { currentASN, isLoading, fetchASNById, receiveASNLine, completeASN } =
    useASNStore();

  const [selectedLine, setSelectedLine] = useState<any>(null);
  const [receiveModal, setReceiveModal] = useState(false);
  const [scannedSKU, setScannedSKU] = useState('');

  // Receiving form state
  const [receivingData, setReceivingData] = useState({
    receivedQuantity: 0,
    acceptedQuantity: 0,
    rejectedQuantity: 0,
    batchNumberReceived: '',
    expiryDateReceived: '',
    lpnReceived: '',
    varianceReasonCode: '',
    varianceNotes: '',
    qaHold: false,
    temperatureReading: '',
    photoEvidence: [] as File[],
  });

  useEffect(() => {
    if (id) {
      fetchASNById(id);
    }
  }, [id]);

  // Handle SKU scan
  const handleSKUScan = (code: string) => {
    setScannedSKU(code);
    const line = currentASN?.lines?.find(
      (l) => l.sku?.skuCode === code || l.sku?.barcode === code
    );

    if (line) {
      setSelectedLine(line);
      setReceiveModal(true);
      setReceivingData((prev) => ({
        ...prev,
        receivedQuantity: line.expectedQuantity,
        acceptedQuantity: line.expectedQuantity,
      }));
    } else {
      showErrorToast('SKU not found', `No line found for SKU: ${code}`);
    }
  };

  // Handle manual line selection
  const handleSelectLine = (line: any) => {
    setSelectedLine(line);
    setReceiveModal(true);
    setReceivingData({
      receivedQuantity: line.expectedQuantity,
      acceptedQuantity: line.expectedQuantity,
      rejectedQuantity: 0,
      batchNumberReceived: line.batchNumberExpected || '',
      expiryDateReceived: line.expiryDateExpected || '',
      lpnReceived: line.lpnExpected || '',
      varianceReasonCode: '',
      varianceNotes: '',
      qaHold: false,
      temperatureReading: '',
      photoEvidence: [],
    });
  };

  // Handle receive submission
  const handleReceiveLine = async () => {
    if (!selectedLine || !currentASN) return;

    try {
      const hasVariance =
        receivingData.receivedQuantity !== selectedLine.expectedQuantity;

      await receiveASNLine(currentASN.id, selectedLine.id, {
        ...receivingData,
        temperatureReading: receivingData.temperatureReading
          ? parseFloat(receivingData.temperatureReading)
          : undefined,
        varianceType: hasVariance ? 'QUANTITY' : undefined,
        photoEvidenceUrls: [], // In real app, upload files first
      });

      showSuccessToast('Line received successfully');
      setReceiveModal(false);
      setSelectedLine(null);
      setScannedSKU('');
      setReceivingData({
        receivedQuantity: 0,
        acceptedQuantity: 0,
        rejectedQuantity: 0,
        batchNumberReceived: '',
        expiryDateReceived: '',
        lpnReceived: '',
        varianceReasonCode: '',
        varianceNotes: '',
        qaHold: false,
        temperatureReading: '',
        photoEvidence: [],
      });

      // Refresh ASN data
      await fetchASNById(currentASN.id);
    } catch (error) {
      showErrorToast('Failed to receive line');
    }
  };

  // Handle complete ASN
  const handleComplete = async () => {
    if (!currentASN) return;

    try {
      await completeASN(currentASN.id);
      showSuccessToast('ASN completed successfully');
      navigate(`/asn/${currentASN.id}`);
    } catch (error) {
      showErrorToast('Failed to complete ASN');
    }
  };

  if (isLoading || !currentASN) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600" />
      </div>
    );
  }

  const pendingLines =
    currentASN.lines?.filter((l) => l.lineStatus === 'PENDING') || [];
  const receivedLines =
    currentASN.lines?.filter((l) => l.lineStatus !== 'PENDING') || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center space-x-2">
            <Link to={`/asn/${currentASN.id}`} className="text-gray-400 hover:text-gray-600">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
            <h1 className="text-2xl font-bold text-gray-900">
              Receiving ASN {currentASN.asnNumber}
            </h1>
          </div>
          <p className="mt-1 text-sm text-gray-600">
            Scan items or select lines to receive
          </p>
        </div>

        <div className="flex space-x-3">
          <Button variant="ghost" onClick={() => navigate(`/asn/${currentASN.id}`)}>
            Cancel
          </Button>
          {pendingLines.length === 0 && (
            <Button variant="success" onClick={handleComplete}>
              Complete ASN
            </Button>
          )}
        </div>
      </div>

      {/* Progress Bar */}
      <Card>
        <CardBody>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">Progress</span>
            <span className="text-sm text-gray-600">
              {receivedLines.length} / {currentASN.lines?.length || 0} lines
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-success-600 h-2 rounded-full transition-all"
              style={{
                width: `${
                  ((receivedLines.length / (currentASN.lines?.length || 1)) * 100)
                }%`,
              }}
            />
          </div>
        </CardBody>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Barcode Scanner */}
        <Card>
          <CardHeader title="Scan SKU" />
          <CardBody>
            <BarcodeInput
              value={scannedSKU}
              onChange={setScannedSKU}
              placeholder="Scan or enter SKU code"
              onScan={handleSKUScan}
            />
          </CardBody>
        </Card>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 gap-4">
          <Card>
            <CardBody>
              <p className="text-sm text-gray-600">Pending</p>
              <p className="mt-1 text-2xl font-bold text-warning-600">
                {pendingLines.length}
              </p>
            </CardBody>
          </Card>
          <Card>
            <CardBody>
              <p className="text-sm text-gray-600">Received</p>
              <p className="mt-1 text-2xl font-bold text-success-600">
                {receivedLines.length}
              </p>
            </CardBody>
          </Card>
        </div>
      </div>

      {/* Pending Lines */}
      {pendingLines.length > 0 && (
        <Card>
          <CardHeader title="Pending Lines" subtitle={`${pendingLines.length} lines to receive`} />
          <CardBody>
            <div className="space-y-3">
              {pendingLines.map((line) => (
                <div
                  key={line.id}
                  className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 cursor-pointer"
                  onClick={() => handleSelectLine(line)}
                >
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">
                      Line #{line.lineNumber} - {line.sku?.skuCode}
                    </p>
                    <p className="text-sm text-gray-600">{line.sku?.productName}</p>
                    <p className="text-sm text-gray-500 mt-1">
                      Expected: {formatNumber(line.expectedQuantity)} {line.uom}
                    </p>
                  </div>
                  <Button size="sm" variant="primary">
                    Receive
                  </Button>
                </div>
              ))}
            </div>
          </CardBody>
        </Card>
      )}

      {/* Received Lines */}
      {receivedLines.length > 0 && (
        <Card>
          <CardHeader title="Received Lines" subtitle={`${receivedLines.length} lines completed`} />
          <CardBody>
            <div className="space-y-3">
              {receivedLines.map((line) => (
                <div
                  key={line.id}
                  className="flex items-center justify-between p-4 bg-success-50 rounded-lg"
                >
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">
                      Line #{line.lineNumber} - {line.sku?.skuCode}
                    </p>
                    <p className="text-sm text-gray-600">{line.sku?.productName}</p>
                    <p className="text-sm text-gray-500 mt-1">
                      Received: {formatNumber(line.receivedQuantity || 0)} {line.uom}
                    </p>
                  </div>
                  <StatusBadge status={line.lineStatus} />
                </div>
              ))}
            </div>
          </CardBody>
        </Card>
      )}

      {/* Receiving Modal */}
      <Modal
        isOpen={receiveModal}
        onClose={() => {
          setReceiveModal(false);
          setSelectedLine(null);
        }}
        title={`Receive Line #${selectedLine?.lineNumber}`}
        size="lg"
      >
        {selectedLine && (
          <div className="space-y-4">
            {/* SKU Info */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="font-medium text-gray-900">{selectedLine.sku?.skuCode}</p>
              <p className="text-sm text-gray-600">{selectedLine.sku?.productName}</p>
              <p className="text-sm text-gray-500 mt-2">
                Expected: {formatNumber(selectedLine.expectedQuantity)} {selectedLine.uom}
              </p>
            </div>

            {/* Quantities */}
            <div className="grid grid-cols-3 gap-4">
              <Input
                type="number"
                label="Received Qty"
                value={receivingData.receivedQuantity}
                onChange={(e) => {
                  const received = parseInt(e.target.value) || 0;
                  setReceivingData((prev) => ({
                    ...prev,
                    receivedQuantity: received,
                    acceptedQuantity: Math.max(0, received - prev.rejectedQuantity),
                  }));
                }}
                required
              />
              <Input
                type="number"
                label="Accepted Qty"
                value={receivingData.acceptedQuantity}
                onChange={(e) =>
                  setReceivingData((prev) => ({
                    ...prev,
                    acceptedQuantity: parseInt(e.target.value) || 0,
                  }))
                }
                required
              />
              <Input
                type="number"
                label="Rejected Qty"
                value={receivingData.rejectedQuantity}
                onChange={(e) => {
                  const rejected = parseInt(e.target.value) || 0;
                  setReceivingData((prev) => ({
                    ...prev,
                    rejectedQuantity: rejected,
                    acceptedQuantity: Math.max(0, prev.receivedQuantity - rejected),
                  }));
                }}
              />
            </div>

            {/* Batch/Lot Info */}
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Batch Number"
                value={receivingData.batchNumberReceived}
                onChange={(e) =>
                  setReceivingData((prev) => ({
                    ...prev,
                    batchNumberReceived: e.target.value,
                  }))
                }
              />
              <Input
                type="date"
                label="Expiry Date"
                value={receivingData.expiryDateReceived}
                onChange={(e) =>
                  setReceivingData((prev) => ({
                    ...prev,
                    expiryDateReceived: e.target.value,
                  }))
                }
              />
            </div>

            {/* LPN */}
            <BarcodeInput
              label="LPN (License Plate Number)"
              value={receivingData.lpnReceived}
              onChange={(value) =>
                setReceivingData((prev) => ({ ...prev, lpnReceived: value }))
              }
              placeholder="Scan or enter LPN"
            />

            {/* Variance (if any) */}
            {receivingData.receivedQuantity !== selectedLine.expectedQuantity && (
              <div className="border-l-4 border-warning-500 bg-warning-50 p-4 rounded">
                <p className="text-sm font-medium text-warning-800 mb-3">
                  Variance Detected: {receivingData.receivedQuantity - selectedLine.expectedQuantity} units
                </p>
                <div className="space-y-3">
                  <Input
                    label="Reason Code"
                    value={receivingData.varianceReasonCode}
                    onChange={(e) =>
                      setReceivingData((prev) => ({
                        ...prev,
                        varianceReasonCode: e.target.value,
                      }))
                    }
                    placeholder="e.g., SHORT_SHIP, DAMAGE"
                  />
                  <Textarea
                    label="Notes"
                    value={receivingData.varianceNotes}
                    onChange={(e) =>
                      setReceivingData((prev) => ({
                        ...prev,
                        varianceNotes: e.target.value,
                      }))
                    }
                    rows={2}
                    placeholder="Explain the variance..."
                  />
                </div>
              </div>
            )}

            {/* Additional Info */}
            <div className="grid grid-cols-2 gap-4">
              <Input
                type="number"
                label="Temperature (°C)"
                value={receivingData.temperatureReading}
                onChange={(e) =>
                  setReceivingData((prev) => ({
                    ...prev,
                    temperatureReading: e.target.value,
                  }))
                }
                placeholder="Optional"
              />
              <div className="flex items-center pt-8">
                <input
                  type="checkbox"
                  id="qaHold"
                  checked={receivingData.qaHold}
                  onChange={(e) =>
                    setReceivingData((prev) => ({ ...prev, qaHold: e.target.checked }))
                  }
                  className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                />
                <label htmlFor="qaHold" className="ml-2 text-sm text-gray-700">
                  Place on QA Hold
                </label>
              </div>
            </div>

            {/* Photo Evidence */}
            <FileUpload
              label="Photo Evidence (Optional)"
              onFileSelect={(files) =>
                setReceivingData((prev) => ({ ...prev, photoEvidence: files }))
              }
              accept="image/*"
              multiple
              maxSize={10}
            />

            {/* Actions */}
            <div className="flex justify-end space-x-3 pt-4 border-t">
              <Button
                variant="ghost"
                onClick={() => {
                  setReceiveModal(false);
                  setSelectedLine(null);
                }}
              >
                Cancel
              </Button>
              <Button variant="primary" onClick={handleReceiveLine}>
                Confirm Receipt
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
