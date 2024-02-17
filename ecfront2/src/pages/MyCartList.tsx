import { FC } from 'react';
import DashboardBottomNavigation from '../components/DashboardBottomNavigation';
import Appbar from '../components/Appbar';

const Dashboard: FC = () => {
  return (
    <div>
      <Appbar />
      <DashboardBottomNavigation />
    </div>
  );
};

export default Dashboard;