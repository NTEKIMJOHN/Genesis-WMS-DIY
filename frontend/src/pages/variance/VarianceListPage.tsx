import { Card, CardHeader, CardBody } from '../../components/ui';

export const VarianceListPage: React.FC = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Variance Management</h1>
        <p className="mt-1 text-sm text-gray-600">Review and resolve receiving variances</p>
      </div>
      <Card>
        <CardHeader title="Variances" />
        <CardBody>
          <div className="text-center py-12 text-gray-500">
            <p>No variances found</p>
          </div>
        </CardBody>
      </Card>
    </div>
  );
};
