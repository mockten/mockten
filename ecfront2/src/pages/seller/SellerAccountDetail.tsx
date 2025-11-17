import { FC } from 'react';
import RecommendedItems from '../../components/RecommendedItems';
import Appbar from '../../components/Appbar';
import Footer from '../../components/Footer';

const Dashboard: FC = () => {
  return (
    <div>
      <Appbar />
      <RecommendedItems />
      <Footer />
    </div>
  );
};

export default Dashboard;