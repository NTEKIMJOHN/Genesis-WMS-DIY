import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '../../store';
import { showErrorToast, showSuccessToast } from '../../store/uiStore';
import { Button, Input, Select } from '../../components/ui';
import { UserRole } from '../../types';

// ==========================================
// REGISTER PAGE
// ==========================================

export const RegisterPage: React.FC = () => {
  const navigate = useNavigate();
  const register = useAuthStore((state) => state.register);
  const isLoading = useAuthStore((state) => state.isLoading);

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
    tenantId: '',
    role: 'WAREHOUSE_RECEIVER' as UserRole,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const roleOptions = [
    { value: 'WAREHOUSE_RECEIVER', label: 'Warehouse Receiver' },
    { value: 'RECEIVING_SUPERVISOR', label: 'Receiving Supervisor' },
    { value: 'WAREHOUSE_MANAGER', label: 'Warehouse Manager' },
    { value: 'PUTAWAY_OPERATOR', label: 'Putaway Operator' },
    { value: 'QA_INSPECTOR', label: 'QA Inspector' },
  ];

  const validate = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.firstName) newErrors.firstName = 'First name is required';
    if (!formData.lastName) newErrors.lastName = 'Last name is required';
    if (!formData.email) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Email is invalid';
    }

    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }

    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) return;

    try {
      const { confirmPassword, ...registerData } = formData;
      await register(registerData);
      showSuccessToast('Registration successful', 'Welcome to Genesis WMS!');
      navigate('/');
    } catch (error: any) {
      showErrorToast('Registration failed', error.error || 'Please try again');
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
    if (errors[e.target.name]) {
      setErrors((prev) => ({ ...prev, [e.target.name]: '' }));
    }
  };

  return (
    <div>
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-gray-900">Create Account</h2>
        <p className="mt-2 text-sm text-gray-600">
          Register for the Receiving Management Module
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <Input
            name="firstName"
            label="First Name"
            value={formData.firstName}
            onChange={handleChange}
            error={errors.firstName}
            required
          />

          <Input
            name="lastName"
            label="Last Name"
            value={formData.lastName}
            onChange={handleChange}
            error={errors.lastName}
            required
          />
        </div>

        <Input
          type="email"
          name="email"
          label="Email Address"
          value={formData.email}
          onChange={handleChange}
          error={errors.email}
          placeholder="you@example.com"
          required
        />

        <Select
          name="role"
          label="Role"
          value={formData.role}
          onChange={handleChange}
          options={roleOptions}
          required
        />

        <Input
          type="password"
          name="password"
          label="Password"
          value={formData.password}
          onChange={handleChange}
          error={errors.password}
          placeholder="••••••••"
          required
        />

        <Input
          type="password"
          name="confirmPassword"
          label="Confirm Password"
          value={formData.confirmPassword}
          onChange={handleChange}
          error={errors.confirmPassword}
          placeholder="••••••••"
          required
        />

        <Button
          type="submit"
          variant="primary"
          className="w-full mt-6"
          isLoading={isLoading}
        >
          Create Account
        </Button>
      </form>

      <div className="mt-6 text-center">
        <p className="text-sm text-gray-600">
          Already have an account?{' '}
          <Link to="/login" className="font-medium text-primary-600 hover:text-primary-500">
            Sign in here
          </Link>
        </p>
      </div>
    </div>
  );
};
