import { FC } from 'react';
import DashboardBottomNavigation from '../components/DashboardBottomNavigation';
import SearchResultItems from '../components/SearchResultItems';
import Appbar from '../components/Appbar';

const Dashboard: FC = () => {
  return (
    <div>
      <Appbar />
      <SearchResultItems />
      <DashboardBottomNavigation />
    </div>
  );
};

export default Dashboard;