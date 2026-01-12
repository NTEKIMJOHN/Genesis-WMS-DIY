import { Card, CardHeader, CardBody, Button } from '../../components/ui';
import { Link } from 'react-router-dom';

export const BlindReceiptListPage: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Blind Receipts</h1>
          <p className="mt-1 text-sm text-gray-600">Manage unplanned deliveries and blind receipts</p>
        </div>
        <Link to="/blind-receipts/create">
          <Button variant="primary">Create Blind Receipt</Button>
        </Link>
      </div>
      <Card>
        <CardHeader title="Blind Receipts" />
        <CardBody>
          <div className="text-center py-12 text-gray-500">
            <p>No blind receipts found</p>
          </div>
        </CardBody>
      </Card>
    </div>
  );
};
