import { Card, CardHeader, CardBody, Button } from '../../components/ui';

export const LPNListPage: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">LPN Management</h1>
          <p className="mt-1 text-sm text-gray-600">Manage License Plate Numbers and container tracking</p>
        </div>
        <Button variant="primary">Create LPN</Button>
      </div>
      <Card>
        <CardHeader title="LPNs" />
        <CardBody>
          <div className="text-center py-12 text-gray-500">
            <p>No LPNs found</p>
          </div>
        </CardBody>
      </Card>
    </div>
  );
};
