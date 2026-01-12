import { Card, CardHeader, CardBody } from '../../components/ui';

export const PutawayListPage: React.FC = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Putaway Tasks</h1>
        <p className="mt-1 text-sm text-gray-600">Manage putaway operations and task assignments</p>
      </div>
      <Card>
        <CardHeader title="Putaway Tasks" />
        <CardBody>
          <div className="text-center py-12 text-gray-500">
            <p>No putaway tasks found</p>
          </div>
        </CardBody>
      </Card>
    </div>
  );
};
