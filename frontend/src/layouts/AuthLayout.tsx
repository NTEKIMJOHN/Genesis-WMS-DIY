import { Outlet } from 'react-router-dom';

// ==========================================
// AUTH LAYOUT
// ==========================================

export const AuthLayout: React.FC = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">Genesis WMS</h1>
          <p className="text-primary-100">Receiving Management Module</p>
        </div>

        <div className="bg-white rounded-lg shadow-xl p-8">
          <Outlet />
        </div>

        <div className="text-center mt-6">
          <p className="text-primary-100 text-sm">
            © 2026 Genesis WMS. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
};
