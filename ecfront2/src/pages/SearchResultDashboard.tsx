import { FC } from 'react';
import { useLocation } from 'react-router-dom';
import DashboardBottomNavigation from '../components/DashboardBottomNavigation';
import SearchResultItems from '../components/SearchResultItems';
import Appbar from '../components/Appbar';

const Dashboard: FC = () => {
  const location = useLocation();
  const { items } = location.state || { items: [] };
  
  return (
    <div>
      <Appbar />
      <SearchResultItems items={items}/>
      <DashboardBottomNavigation />
    </div>
  );
};

export default Dashboard;