import { FC } from 'react';
import ItemDetailCard from '../components/ItemDetailCard';
import Appbar from '../components/Appbar';
import DashboardBottomNavigation from '../components/DashboardBottomNavigation';
import { Breadcrumbs, Link, Typography} from '@mui/material';

const ItemDetailPage: FC = () => {
  return (
    <div>
      <Appbar />
      <Breadcrumbs aria-label="breadcrumb" sx={{ mb: 2 }}>
        <Link underline="hover" color="text.primary" href="/">
          Mockten
        </Link>
        <Link underline="hover" color="text.primary" href="/category">
          Music
        </Link>
        <Typography color="text.primary">Detail</Typography>
      </Breadcrumbs>
      <ItemDetailCard />
      <DashboardBottomNavigation />
    </div>
  );
};

export default ItemDetailPage;