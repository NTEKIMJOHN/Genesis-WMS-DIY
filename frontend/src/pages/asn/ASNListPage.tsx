import { Link } from 'react-router-dom';
import { Card, CardHeader, CardBody, Button } from '../../components/ui';

export const ASNListPage: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">ASN Receiving</h1>
          <p className="mt-1 text-sm text-gray-600">
            Manage Advanced Shipping Notices and receiving operations
          </p>
        </div>
        <Button variant="primary">Create ASN</Button>
      </div>

      <Card>
        <CardHeader title="ASN Queue" subtitle="All ASNs awaiting receiving" />
        <CardBody>
          <div className="text-center py-12 text-gray-500">
            <p>No ASNs found</p>
            <p className="text-sm mt-2">ASNs will appear here when created</p>
          </div>
        </CardBody>
      </Card>
    </div>
  );
};
