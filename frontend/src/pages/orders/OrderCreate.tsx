import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import api from '../../lib/api';
import { toast } from 'react-toastify';
import { ArrowLeft, Plus, Trash2 } from 'lucide-react';

export default function OrderCreate() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    orderType: 'SALES',
    customerId: '',
    customerName: '',
    customerEmail: '',
    customerPhone: '',
    shippingAddress: {
      street: '',
      city: '',
      state: '',
      postalCode: '',
      country: '',
    },
    priority: 'NORMAL',
    allocationStrategy: 'FIFO',
    carrier: '',
    serviceLevel: 'Ground',
    specialInstructions: '',
  });

  const [orderLines, setOrderLines] = useState([
    { productId: '', lineNumber: 1, quantityOrdered: 1, uom: 'Each', unitPrice: 0 },
  ]);

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await api.post('/orders', data);
      return response.data;
    },
    onSuccess: (data) => {
      toast.success('Order created successfully!');
      navigate(`/orders/${data.data.id}`);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to create order');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate({
      ...formData,
      warehouseId: 'default-warehouse-id', // Should come from selection
      orderLines,
    });
  };

  const addLine = () => {
    setOrderLines([
      ...orderLines,
      { productId: '', lineNumber: orderLines.length + 1, quantityOrdered: 1, uom: 'Each', unitPrice: 0 },
    ]);
  };

  const removeLine = (index: number) => {
    setOrderLines(orderLines.filter((_, i) => i !== index));
  };

  return (
    <div>
      <button onClick={() => navigate('/orders')} className="btn-secondary mb-6 flex items-center gap-2">
        <ArrowLeft className="w-4 h-4" />
        Back to Orders
      </button>

      <h1 className="text-3xl font-bold text-gray-900 mb-6">Create New Order</h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Order Information */}
        <div className="card">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Order Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Order Type</label>
              <select
                value={formData.orderType}
                onChange={(e) => setFormData({ ...formData, orderType: e.target.value })}
                className="input"
              >
                <option value="SALES">Sales Order</option>
                <option value="TRANSFER">Transfer Order</option>
                <option value="RETURN">Return Order</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
              <select
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                className="input"
              >
                <option value="LOW">Low</option>
                <option value="NORMAL">Normal</option>
                <option value="HIGH">High</option>
                <option value="URGENT">Urgent</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Allocation Strategy</label>
              <select
                value={formData.allocationStrategy}
                onChange={(e) => setFormData({ ...formData, allocationStrategy: e.target.value })}
                className="input"
              >
                <option value="FIFO">FIFO - First In First Out</option>
                <option value="FEFO">FEFO - First Expired First Out</option>
                <option value="LIFO">LIFO - Last In First Out</option>
              </select>
            </div>
          </div>
        </div>

        {/* Customer Information */}
        <div className="card">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Customer Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Customer Name *</label>
              <input
                type="text"
                required
                value={formData.customerName}
                onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
                className="input"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                type="email"
                value={formData.customerEmail}
                onChange={(e) => setFormData({ ...formData, customerEmail: e.target.value })}
                className="input"
              />
            </div>
          </div>
        </div>

        {/* Order Lines */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-900">Order Lines</h2>
            <button type="button" onClick={addLine} className="btn-secondary flex items-center gap-2">
              <Plus className="w-4 h-4" />
              Add Line
            </button>
          </div>

          <div className="space-y-4">
            {orderLines.map((line, index) => (
              <div key={index} className="flex gap-4 items-start p-4 bg-gray-50 rounded-lg">
                <div className="flex-1 grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Product SKU</label>
                    <input
                      type="text"
                      required
                      value={line.productId}
                      onChange={(e) => {
                        const newLines = [...orderLines];
                        newLines[index].productId = e.target.value;
                        setOrderLines(newLines);
                      }}
                      className="input"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Quantity</label>
                    <input
                      type="number"
                      required
                      min="1"
                      value={line.quantityOrdered}
                      onChange={(e) => {
                        const newLines = [...orderLines];
                        newLines[index].quantityOrdered = parseInt(e.target.value);
                        setOrderLines(newLines);
                      }}
                      className="input"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">UOM</label>
                    <input
                      type="text"
                      value={line.uom}
                      onChange={(e) => {
                        const newLines = [...orderLines];
                        newLines[index].uom = e.target.value;
                        setOrderLines(newLines);
                      }}
                      className="input"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Unit Price</label>
                    <input
                      type="number"
                      step="0.01"
                      value={line.unitPrice}
                      onChange={(e) => {
                        const newLines = [...orderLines];
                        newLines[index].unitPrice = parseFloat(e.target.value);
                        setOrderLines(newLines);
                      }}
                      className="input"
                    />
                  </div>
                </div>
                {orderLines.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeLine(index)}
                    className="mt-6 p-2 text-red-600 hover:bg-red-50 rounded"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-4">
          <button
            type="submit"
            disabled={createMutation.isPending}
            className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {createMutation.isPending ? 'Creating...' : 'Create Order'}
          </button>
          <button type="button" onClick={() => navigate('/orders')} className="btn-secondary">
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
