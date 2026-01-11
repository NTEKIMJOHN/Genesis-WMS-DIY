import { useState } from 'react';
import { Package, Printer, CheckCircle } from 'lucide-react';
import { toast } from 'react-toastify';

export default function PackerConsole() {
  const [cartonNumber, setCartonNumber] = useState(1);

  const handleGenerateLabel = () => {
    toast.success('Shipping label generated successfully!');
  };

  const handleCompletePacking = () => {
    toast.success('Packing completed!');
  };

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold text-gray-900 mb-6">Packer Console</h1>

      {/* Current Pack Task */}
      <div className="card mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-900">Current Pack Task</h2>
          <span className="badge bg-indigo-100 text-indigo-800">IN PROGRESS</span>
        </div>

        <div className="space-y-4">
          <div>
            <p className="text-sm text-gray-500">Order Number</p>
            <p className="text-lg font-bold">ORD-20260111-0001</p>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <p className="text-sm text-gray-500">Customer</p>
              <p className="font-medium">Acme Corp</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Items</p>
              <p className="font-medium">12</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Carrier</p>
              <p className="font-medium">FedEx</p>
            </div>
          </div>
        </div>
      </div>

      {/* Items to Pack */}
      <div className="card mb-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Items to Pack</h2>
        <div className="space-y-3">
          {[
            { sku: 'WDG-PRO-001', name: 'Widget Pro', qty: 10, status: 'packed' },
            { sku: 'GDG-LTE-001', name: 'Gadget Lite', qty: 5, status: 'pending' },
            { sku: 'DHK-MAX-001', name: 'Doohickey Max', qty: 2, status: 'pending' },
          ].map((item, index) => (
            <div
              key={index}
              className={`flex items-center justify-between p-4 rounded-lg ${
                item.status === 'packed' ? 'bg-green-50' : 'bg-gray-50'
              }`}
            >
              <div className="flex-1">
                <p className="font-medium text-gray-900">{item.name}</p>
                <p className="text-sm text-gray-500">{item.sku}</p>
              </div>
              <div className="text-center mx-4">
                <p className="text-lg font-bold">{item.qty}</p>
                <p className="text-xs text-gray-500">units</p>
              </div>
              <div>
                {item.status === 'packed' ? (
                  <CheckCircle className="w-6 h-6 text-green-600" />
                ) : (
                  <div className="w-6 h-6 border-2 border-gray-300 rounded-full"></div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Carton Management */}
      <div className="card mb-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Carton Management</h2>
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">Current Carton</label>
              <div className="flex gap-2">
                <input
                  type="number"
                  value={cartonNumber}
                  onChange={(e) => setCartonNumber(parseInt(e.target.value))}
                  className="input flex-1"
                />
                <button className="btn-secondary">Add Carton</button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Weight (kg)</label>
              <input type="number" step="0.1" className="input" placeholder="0.0" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Length (cm)</label>
              <input type="number" className="input" placeholder="0" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Width (cm)</label>
              <input type="number" className="input" placeholder="0" />
            </div>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="space-y-3">
        <button
          onClick={handleGenerateLabel}
          className="w-full btn-primary flex items-center justify-center gap-2 py-4"
        >
          <Printer className="w-6 h-6" />
          Generate Shipping Label
        </button>

        <button
          onClick={handleCompletePacking}
          className="w-full bg-green-600 text-white hover:bg-green-700 btn flex items-center justify-center gap-2 py-4"
        >
          <Package className="w-6 h-6" />
          Complete Packing
        </button>
      </div>

      {/* Instructions */}
      <div className="card mt-6 bg-blue-50">
        <h3 className="font-bold text-blue-900 mb-2">Packing Instructions:</h3>
        <ol className="list-decimal list-inside space-y-1 text-sm text-blue-800">
          <li>Scan each item to verify</li>
          <li>Pack items securely in carton</li>
          <li>Enter carton dimensions and weight</li>
          <li>Generate and print shipping label</li>
          <li>Affix label to package</li>
          <li>Move to shipping staging area</li>
        </ol>
      </div>
    </div>
  );
}
