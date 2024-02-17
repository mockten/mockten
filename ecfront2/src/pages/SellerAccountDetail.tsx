import { FC } from 'react';
import RecommendedItems from '../components/RecommendedItems';
import DashboardBottomNavigation from '../components/DashboardBottomNavigation';
import Appbar from '../components/Appbar';

const Dashboard: FC = () => {
  return (
    <div>
      <Appbar />
      <RecommendedItems />
      <DashboardBottomNavigation />
    </div>
  );
};

export default Dashboard;