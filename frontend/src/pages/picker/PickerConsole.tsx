import { useState } from 'react';
import { Camera, CheckCircle, AlertTriangle } from 'lucide-react';
import { toast } from 'react-toastify';

export default function PickerConsole() {
  const [scanMode, setScanMode] = useState(false);
  const [scannedValue, setScannedValue] = useState('');

  const handleScan = () => {
    setScanMode(true);
    // In a real implementation, this would activate the camera for barcode scanning
    toast.info('Camera scanning activated');
  };

  const handleManualEntry = () => {
    if (scannedValue) {
      toast.success(`Scanned: ${scannedValue}`);
      setScannedValue('');
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold text-gray-900 mb-6">Picker Console</h1>

      {/* Current Task */}
      <div className="card mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-900">Current Pick Task</h2>
          <span className="badge bg-yellow-100 text-yellow-800">IN PROGRESS</span>
        </div>

        <div className="space-y-4">
          <div>
            <p className="text-sm text-gray-500">Task Number</p>
            <p className="text-lg font-bold">PICK-20260111-0001</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-500">Progress</p>
              <p className="text-lg font-bold">5 / 12 items</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Priority</p>
              <p className="text-lg font-bold">HIGH</p>
            </div>
          </div>
        </div>
      </div>

      {/* Next Pick Location */}
      <div className="card mb-6 bg-primary-50 border-2 border-primary-500">
        <div className="text-center py-8">
          <p className="text-sm text-primary-600 font-medium mb-2">GO TO LOCATION</p>
          <p className="text-5xl font-bold text-primary-900 mb-4">A-12-3-B</p>
          <div className="space-y-2">
            <p className="text-gray-700">
              <span className="font-medium">Pick:</span> Widget Pro
            </p>
            <p className="text-gray-700">
              <span className="font-medium">Quantity:</span> 10 units
            </p>
            <p className="text-gray-700">
              <span className="font-medium">Batch:</span> B2025-001
            </p>
          </div>
        </div>
      </div>

      {/* Scan Interface */}
      <div className="card">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Scan Item</h2>

        <div className="space-y-4">
          <button onClick={handleScan} className="w-full btn-primary flex items-center justify-center gap-2 py-4">
            <Camera className="w-6 h-6" />
            Scan Barcode
          </button>

          <div className="relative">
            <p className="text-center text-sm text-gray-500 mb-2">Or enter manually</p>
            <input
              type="text"
              value={scannedValue}
              onChange={(e) => setScannedValue(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleManualEntry()}
              className="input"
              placeholder="Enter barcode or SKU"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <button className="btn-secondary flex items-center justify-center gap-2">
              <CheckCircle className="w-5 h-5" />
              Confirm Pick
            </button>
            <button className="btn-danger flex items-center justify-center gap-2">
              <AlertTriangle className="w-5 h-5" />
              Report Issue
            </button>
          </div>
        </div>
      </div>

      {/* Instructions */}
      <div className="card mt-6 bg-blue-50">
        <h3 className="font-bold text-blue-900 mb-2">Picking Instructions:</h3>
        <ol className="list-decimal list-inside space-y-1 text-sm text-blue-800">
          <li>Navigate to the location shown above</li>
          <li>Scan the location barcode to verify</li>
          <li>Scan the item barcode</li>
          <li>Confirm the quantity picked</li>
          <li>Move to the next item</li>
        </ol>
      </div>
    </div>
  );
}
