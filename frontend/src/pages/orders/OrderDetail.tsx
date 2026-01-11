import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import api from '../../lib/api';
import { ArrowLeft, Package, MapPin, Calendar, User } from 'lucide-react';

const statusColors: Record<string, string> = {
  NEW: 'bg-blue-100 text-blue-800',
  ALLOCATED: 'bg-purple-100 text-purple-800',
  PICKING: 'bg-yellow-100 text-yellow-800',
  PICKED: 'bg-orange-100 text-orange-800',
  PACKING: 'bg-indigo-100 text-indigo-800',
  PACKED: 'bg-cyan-100 text-cyan-800',
  SHIPPED: 'bg-green-100 text-green-800',
  DELIVERED: 'bg-emerald-100 text-emerald-800',
  CANCELLED: 'bg-red-100 text-red-800',
};

export default function OrderDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const { data, isLoading } = useQuery({
    queryKey: ['order', id],
    queryFn: async () => {
      const response = await api.get(`/orders/${id}`);
      return response.data.data;
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  const order = data;

  return (
    <div>
      <button onClick={() => navigate('/orders')} className="btn-secondary mb-6 flex items-center gap-2">
        <ArrowLeft className="w-4 h-4" />
        Back to Orders
      </button>

      {/* Header */}
      <div className="card mb-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{order.orderNumber}</h1>
            <div className="flex items-center gap-4 mt-2">
              <span className={`badge ${statusColors[order.status]}`}>{order.status}</span>
              <span className="text-gray-500">Priority: {order.priority}</span>
            </div>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-500">Order Date</p>
            <p className="font-medium">{new Date(order.orderDate).toLocaleDateString()}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Order Lines */}
          <div className="card">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Order Lines</h2>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">SKU</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ordered</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Allocated</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Picked</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Shipped</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {order.orderLines?.map((line: any) => (
                    <tr key={line.id}>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{line.product?.sku}</div>
                        <div className="text-sm text-gray-500">{line.product?.name}</div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm">{line.quantityOrdered}</td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm">{line.quantityAllocated}</td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm">{line.quantityPicked}</td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm">{line.quantityShipped}</td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <span className="badge bg-gray-100 text-gray-800">{line.lineStatus}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Activity Timeline */}
          <div className="card">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Activity Timeline</h2>
            <div className="space-y-4">
              {order.orderEvents?.map((event: any) => (
                <div key={event.id} className="flex gap-4">
                  <div className="flex-shrink-0 w-2 h-2 bg-primary-600 rounded-full mt-2"></div>
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">{event.description}</p>
                    <p className="text-sm text-gray-500">
                      {new Date(event.createdAt).toLocaleString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          {/* Customer Info */}
          <div className="card">
            <div className="flex items-center gap-2 mb-4">
              <User className="w-5 h-5 text-gray-500" />
              <h2 className="text-lg font-bold text-gray-900">Customer</h2>
            </div>
            <div className="space-y-2">
              <p className="font-medium">{order.customerName}</p>
              <p className="text-sm text-gray-500">{order.customerEmail}</p>
              <p className="text-sm text-gray-500">{order.customerPhone}</p>
            </div>
          </div>

          {/* Shipping Address */}
          <div className="card">
            <div className="flex items-center gap-2 mb-4">
              <MapPin className="w-5 h-5 text-gray-500" />
              <h2 className="text-lg font-bold text-gray-900">Shipping Address</h2>
            </div>
            <div className="text-sm text-gray-600">
              <p>{order.shippingAddress?.street}</p>
              <p>
                {order.shippingAddress?.city}, {order.shippingAddress?.state}{' '}
                {order.shippingAddress?.postalCode}
              </p>
              <p>{order.shippingAddress?.country}</p>
            </div>
          </div>

          {/* Order Summary */}
          <div className="card">
            <div className="flex items-center gap-2 mb-4">
              <Package className="w-5 h-5 text-gray-500" />
              <h2 className="text-lg font-bold text-gray-900">Order Summary</h2>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Total Lines:</span>
                <span className="font-medium">{order.totalLines}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Total Units:</span>
                <span className="font-medium">{order.totalUnitsOrdered}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Carrier:</span>
                <span className="font-medium">{order.carrier || 'Not assigned'}</span>
              </div>
              {order.trackingNumber && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Tracking:</span>
                  <span className="font-medium">{order.trackingNumber}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
