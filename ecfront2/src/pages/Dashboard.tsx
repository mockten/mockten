import { FC } from 'react';
import DashboardBottomNavigation from '../components/DashboardBottomNavigation';
import RecommendedItems from '../components/RecommendedItems';
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