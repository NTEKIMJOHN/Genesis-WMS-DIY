import { Package, TrendingUp, Clock, CheckCircle } from 'lucide-react';

export default function Dashboard() {
  const stats = [
    {
      name: 'Total Orders Today',
      value: '24',
      change: '+12%',
      icon: Package,
      color: 'bg-blue-500',
    },
    {
      name: 'Orders Pending',
      value: '8',
      change: '-5%',
      icon: Clock,
      color: 'bg-yellow-500',
    },
    {
      name: 'Orders Shipped',
      value: '16',
      change: '+8%',
      icon: CheckCircle,
      color: 'bg-green-500',
    },
    {
      name: 'Pick Accuracy',
      value: '99.2%',
      change: '+0.3%',
      icon: TrendingUp,
      color: 'bg-purple-500',
    },
  ];

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500 mt-1">Welcome to Genesis WMS Order Management</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.name} className="card">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">{stat.name}</p>
                  <p className="text-2xl font-bold text-gray-900 mt-2">{stat.value}</p>
                  <p className="text-sm text-gray-500 mt-1">{stat.change} from yesterday</p>
                </div>
                <div className={`${stat.color} p-3 rounded-lg`}>
                  <Icon className="w-6 h-6 text-white" />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Quick Actions */}
      <div className="card">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button className="p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-primary-500 hover:bg-primary-50 transition-colors">
            <Package className="w-6 h-6 text-primary-600 mb-2" />
            <p className="font-medium">Create New Order</p>
          </button>
          <button className="p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-primary-500 hover:bg-primary-50 transition-colors">
            <Clock className="w-6 h-6 text-primary-600 mb-2" />
            <p className="font-medium">View Pending Orders</p>
          </button>
          <button className="p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-primary-500 hover:bg-primary-50 transition-colors">
            <TrendingUp className="w-6 h-6 text-primary-600 mb-2" />
            <p className="font-medium">View Reports</p>
          </button>
        </div>
      </div>
    </div>
  );
}
