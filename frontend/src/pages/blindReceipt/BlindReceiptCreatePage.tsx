import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import blindReceiptService, { CreateBlindReceiptInput, AddBlindReceiptLineInput } from '../../services/blindReceipt.service';
import { Card, CardHeader, CardBody, Button, Input, Select, Textarea, BarcodeInput } from '../../components/ui';
import { showErrorToast, showSuccessToast } from '../../store/uiStore';
import { ItemCondition } from '../../types';

export const BlindReceiptCreatePage: React.FC = () => {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);

  const [receiptInfo, setReceiptInfo] = useState({
    receiptType: 'UNPLANNED_DELIVERY' as 'UNPLANNED_DELIVERY' | 'SAMPLE' | 'RETURN' | 'OTHER',
    supplierName: '',
    supplierContact: '',
    carrier: '',
    driverName: '',
    vehicleId: '',
    arrivalDate: new Date().toISOString().split('T')[0],
    arrivalTime: new Date().toTimeString().split(' ')[0].substring(0, 5),
    priority: 'STANDARD' as 'LOW' | 'STANDARD' | 'HIGH' | 'URGENT',
    specialNotes: '',
  });

  const [lines, setLines] = useState<AddBlindReceiptLineInput[]>([]);
  const [currentLine, setCurrentLine] = useState({
    skuCode: '',
    productName: '',
    quantityReceived: 0,
    uom: 'EA',
    batchNumber: '',
    expiryDate: '',
    lpn: '',
    condition: 'GOOD' as ItemCondition,
    temperatureReading: '',
    qaHold: false,
    estimatedUnitCost: '',
    receiverNotes: '',
  });

  const handleAddLine = () => {
    if (!currentLine.skuCode || !currentLine.productName || currentLine.quantityReceived <= 0) {
      showErrorToast('Invalid line', 'Please fill in SKU, product name, and quantity');
      return;
    }

    const newLine: AddBlindReceiptLineInput = {
      skuCode: currentLine.skuCode,
      productName: currentLine.productName,
      quantityReceived: currentLine.quantityReceived,
      uom: currentLine.uom,
      batchNumber: currentLine.batchNumber || undefined,
      expiryDate: currentLine.expiryDate || undefined,
      lpn: currentLine.lpn || undefined,
      condition: currentLine.condition,
      temperatureReading: currentLine.temperatureReading ? parseFloat(currentLine.temperatureReading) : undefined,
      qaHold: currentLine.qaHold,
      estimatedUnitCost: currentLine.estimatedUnitCost ? parseFloat(currentLine.estimatedUnitCost) : undefined,
      receiverNotes: currentLine.receiverNotes || undefined,
      photoEvidenceUrls: [],
    };

    setLines([...lines, newLine]);
    setCurrentLine({
      skuCode: '',
      productName: '',
      quantityReceived: 0,
      uom: 'EA',
      batchNumber: '',
      expiryDate: '',
      lpn: '',
      condition: 'GOOD',
      temperatureReading: '',
      qaHold: false,
      estimatedUnitCost: '',
      receiverNotes: '',
    });
    showSuccessToast('Line added');
  };

  const handleRemoveLine = (index: number) => {
    setLines(lines.filter((_, i) => i !== index));
  };

  const handleSaveDraft = async () => {
    try {
      const data: CreateBlindReceiptInput = {
        tenantId: 'default-tenant',
        warehouseId: 'default-warehouse',
        ...receiptInfo,
        arrivalDate: `${receiptInfo.arrivalDate}T${receiptInfo.arrivalTime}:00Z`,
      };

      const receipt = await blindReceiptService.createBlindReceipt(data);

      for (const line of lines) {
        await blindReceiptService.addLine(receipt.id, line);
      }

      showSuccessToast('Draft saved');
      navigate('/blind-receipts');
    } catch (error) {
      showErrorToast('Failed to save draft');
    }
  };

  const handleSubmit = async () => {
    if (lines.length === 0) {
      showErrorToast('No lines', 'Please add at least one line');
      return;
    }

    try {
      const data: CreateBlindReceiptInput = {
        tenantId: 'default-tenant',
        warehouseId: 'default-warehouse',
        ...receiptInfo,
        arrivalDate: `${receiptInfo.arrivalDate}T${receiptInfo.arrivalTime}:00Z`,
      };

      const receipt = await blindReceiptService.createBlindReceipt(data);

      for (const line of lines) {
        await blindReceiptService.addLine(receipt.id, line);
      }

      await blindReceiptService.submitForApproval(receipt.id);

      showSuccessToast('Blind receipt submitted for approval');
      navigate('/blind-receipts');
    } catch (error) {
      showErrorToast('Failed to submit receipt');
    }
  };

  const typeOptions = [
    { value: 'UNPLANNED_DELIVERY', label: 'Unplanned Delivery' },
    { value: 'SAMPLE', label: 'Sample' },
    { value: 'RETURN', label: 'Return' },
    { value: 'OTHER', label: 'Other' },
  ];

  const priorityOptions = [
    { value: 'LOW', label: 'Low' },
    { value: 'STANDARD', label: 'Standard' },
    { value: 'HIGH', label: 'High' },
    { value: 'URGENT', label: 'Urgent' },
  ];

  const conditionOptions = [
    { value: 'GOOD', label: 'Good' },
    { value: 'DAMAGED', label: 'Damaged' },
    { value: 'EXPIRED', label: 'Expired' },
    { value: 'UNKNOWN', label: 'Unknown' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center space-x-2">
            <Link to="/blind-receipts" className="text-gray-400 hover:text-gray-600">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
            <h1 className="text-2xl font-bold text-gray-900">Create Blind Receipt</h1>
          </div>
          <p className="mt-1 text-sm text-gray-600">Document unplanned delivery or receipt</p>
        </div>
      </div>

      {/* Step Indicator */}
      <div className="flex items-center justify-center space-x-4">
        <div className={`flex items-center ${currentStep === 1 ? 'text-primary-600' : currentStep > 1 ? 'text-success-600' : 'text-gray-400'}`}>
          <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 ${currentStep === 1 ? 'border-primary-600 bg-primary-50' : currentStep > 1 ? 'border-success-600 bg-success-50' : 'border-gray-300'}`}>
            {currentStep > 1 ? '✓' : '1'}
          </div>
          <span className="ml-2 font-medium">Receipt Info</span>
        </div>
        <div className="w-16 border-t-2 border-gray-300" />
        <div className={`flex items-center ${currentStep === 2 ? 'text-primary-600' : currentStep > 2 ? 'text-success-600' : 'text-gray-400'}`}>
          <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 ${currentStep === 2 ? 'border-primary-600 bg-primary-50' : currentStep > 2 ? 'border-success-600 bg-success-50' : 'border-gray-300'}`}>
            {currentStep > 2 ? '✓' : '2'}
          </div>
          <span className="ml-2 font-medium">Add Lines</span>
        </div>
        <div className="w-16 border-t-2 border-gray-300" />
        <div className={`flex items-center ${currentStep === 3 ? 'text-primary-600' : 'text-gray-400'}`}>
          <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 ${currentStep === 3 ? 'border-primary-600 bg-primary-50' : 'border-gray-300'}`}>
            3
          </div>
          <span className="ml-2 font-medium">Review & Submit</span>
        </div>
      </div>

      {/* Step 1: Receipt Info */}
      {currentStep === 1 && (
        <Card>
          <CardHeader title="Receipt Information" subtitle="Basic details about the delivery" />
          <CardBody>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Select label="Receipt Type" value={receiptInfo.receiptType} onChange={(e) => setReceiptInfo({...receiptInfo, receiptType: e.target.value as any})} options={typeOptions} required />
                <Select label="Priority" value={receiptInfo.priority} onChange={(e) => setReceiptInfo({...receiptInfo, priority: e.target.value as any})} options={priorityOptions} required />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Input label="Supplier Name" value={receiptInfo.supplierName} onChange={(e) => setReceiptInfo({...receiptInfo, supplierName: e.target.value})} required />
                <Input label="Supplier Contact" value={receiptInfo.supplierContact} onChange={(e) => setReceiptInfo({...receiptInfo, supplierContact: e.target.value})} />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <Input label="Carrier" value={receiptInfo.carrier} onChange={(e) => setReceiptInfo({...receiptInfo, carrier: e.target.value})} />
                <Input label="Driver Name" value={receiptInfo.driverName} onChange={(e) => setReceiptInfo({...receiptInfo, driverName: e.target.value})} />
                <Input label="Vehicle ID" value={receiptInfo.vehicleId} onChange={(e) => setReceiptInfo({...receiptInfo, vehicleId: e.target.value})} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Input type="date" label="Arrival Date" value={receiptInfo.arrivalDate} onChange={(e) => setReceiptInfo({...receiptInfo, arrivalDate: e.target.value})} required />
                <Input type="time" label="Arrival Time" value={receiptInfo.arrivalTime} onChange={(e) => setReceiptInfo({...receiptInfo, arrivalTime: e.target.value})} required />
              </div>
              <Textarea label="Special Notes" value={receiptInfo.specialNotes} onChange={(e) => setReceiptInfo({...receiptInfo, specialNotes: e.target.value})} rows={3} />
              <div className="flex justify-end space-x-3 pt-4">
                <Link to="/blind-receipts"><Button variant="ghost">Cancel</Button></Link>
                <Button variant="primary" onClick={() => setCurrentStep(2)}>Next: Add Lines</Button>
              </div>
            </div>
          </CardBody>
        </Card>
      )}

      {/* Step 2: Add Lines */}
      {currentStep === 2 && (
        <div className="space-y-6">
          <Card>
            <CardHeader title="Add Line" subtitle="Enter item details" />
            <CardBody>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <BarcodeInput label="SKU Code" value={currentLine.skuCode} onChange={(v) => setCurrentLine({...currentLine, skuCode: v})} placeholder="Scan or enter SKU" />
                  <Input label="Product Name" value={currentLine.productName} onChange={(e) => setCurrentLine({...currentLine, productName: e.target.value})} required />
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <Input type="number" label="Quantity" value={currentLine.quantityReceived} onChange={(e) => setCurrentLine({...currentLine, quantityReceived: parseInt(e.target.value) || 0})} required />
                  <Input label="UOM" value={currentLine.uom} onChange={(e) => setCurrentLine({...currentLine, uom: e.target.value})} />
                  <Select label="Condition" value={currentLine.condition} onChange={(e) => setCurrentLine({...currentLine, condition: e.target.value as ItemCondition})} options={conditionOptions} />
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <Input label="Batch Number" value={currentLine.batchNumber} onChange={(e) => setCurrentLine({...currentLine, batchNumber: e.target.value})} />
                  <Input type="date" label="Expiry Date" value={currentLine.expiryDate} onChange={(e) => setCurrentLine({...currentLine, expiryDate: e.target.value})} />
                  <BarcodeInput label="LPN" value={currentLine.lpn} onChange={(v) => setCurrentLine({...currentLine, lpn: v})} />
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <Input type="number" step="0.01" label="Temperature (°C)" value={currentLine.temperatureReading} onChange={(e) => setCurrentLine({...currentLine, temperatureReading: e.target.value})} />
                  <Input type="number" step="0.01" label="Est. Unit Cost" value={currentLine.estimatedUnitCost} onChange={(e) => setCurrentLine({...currentLine, estimatedUnitCost: e.target.value})} />
                  <div className="flex items-center pt-8">
                    <input type="checkbox" id="qaHold" checked={currentLine.qaHold} onChange={(e) => setCurrentLine({...currentLine, qaHold: e.target.checked})} className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded" />
                    <label htmlFor="qaHold" className="ml-2 text-sm text-gray-700">QA Hold</label>
                  </div>
                </div>
                <Textarea label="Receiver Notes" value={currentLine.receiverNotes} onChange={(e) => setCurrentLine({...currentLine, receiverNotes: e.target.value})} rows={2} />
                <Button variant="success" onClick={handleAddLine} className="w-full">Add Line to Receipt</Button>
              </div>
            </CardBody>
          </Card>

          {lines.length > 0 && (
            <Card>
              <CardHeader title="Added Lines" subtitle={`${lines.length} line(s)`} />
              <CardBody>
                <div className="space-y-2">
                  {lines.map((line, index) => (
                    <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                      <div>
                        <p className="font-medium">{line.skuCode} - {line.productName}</p>
                        <p className="text-sm text-gray-600">{line.quantityReceived} {line.uom} | Condition: {line.condition}</p>
                      </div>
                      <Button size="sm" variant="danger" onClick={() => handleRemoveLine(index)}>Remove</Button>
                    </div>
                  ))}
                </div>
              </CardBody>
            </Card>
          )}

          <div className="flex justify-between">
            <Button variant="ghost" onClick={() => setCurrentStep(1)}>Back</Button>
            <div className="flex space-x-3">
              <Button variant="ghost" onClick={handleSaveDraft}>Save Draft</Button>
              <Button variant="primary" onClick={() => setCurrentStep(3)} disabled={lines.length === 0}>Next: Review</Button>
            </div>
          </div>
        </div>
      )}

      {/* Step 3: Review */}
      {currentStep === 3 && (
        <div className="space-y-6">
          <Card>
            <CardHeader title="Review Receipt" />
            <CardBody>
              <div className="space-y-4">
                <div className="bg-gray-50 p-4 rounded">
                  <h3 className="font-medium mb-2">Receipt Information</h3>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <p><span className="text-gray-600">Type:</span> {receiptInfo.receiptType.replace(/_/g, ' ')}</p>
                    <p><span className="text-gray-600">Supplier:</span> {receiptInfo.supplierName}</p>
                    <p><span className="text-gray-600">Arrival:</span> {receiptInfo.arrivalDate} {receiptInfo.arrivalTime}</p>
                    <p><span className="text-gray-600">Priority:</span> {receiptInfo.priority}</p>
                  </div>
                </div>
                <div>
                  <h3 className="font-medium mb-2">Lines ({lines.length})</h3>
                  <div className="border rounded overflow-hidden">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">SKU</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Product</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Qty</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Condition</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {lines.map((line, i) => (
                          <tr key={i}>
                            <td className="px-4 py-2 text-sm">{line.skuCode}</td>
                            <td className="px-4 py-2 text-sm">{line.productName}</td>
                            <td className="px-4 py-2 text-sm">{line.quantityReceived} {line.uom}</td>
                            <td className="px-4 py-2 text-sm">{line.condition}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </CardBody>
          </Card>

          <div className="flex justify-between">
            <Button variant="ghost" onClick={() => setCurrentStep(2)}>Back</Button>
            <div className="flex space-x-3">
              <Button variant="ghost" onClick={handleSaveDraft}>Save Draft</Button>
              <Button variant="success" onClick={handleSubmit}>Submit for Approval</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
