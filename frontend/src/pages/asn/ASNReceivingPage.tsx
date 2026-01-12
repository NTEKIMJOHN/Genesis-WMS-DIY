import { useParams } from 'react-router-dom';
import { Card } from '../../components/ui';

export const ASNReceivingPage: React.FC = () => {
  const { id } = useParams();
  return (
    <div>
      <h1 className="text-2xl font-bold">Receiving ASN: {id}</h1>
      <Card className="mt-4 p-8"><p className="text-gray-500 text-center">ASN receiving interface will be displayed here</p></Card>
    </div>
  );
};
