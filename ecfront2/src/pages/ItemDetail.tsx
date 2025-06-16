import { FC, useState } from 'react';
import ItemDetailCard from '../components/ItemDetailCard';
import Appbar from '../components/Appbar';
import DashboardBottomNavigation from '../components/DashboardBottomNavigation';
import { Breadcrumbs, Link, Typography } from '@mui/material';

const ItemDetailPage: FC = () => {
  const [productName, setProductName] = useState('');
  const [categoryName, setCategoryName] = useState('');

  return (
    <div>
      <Appbar />
      <Breadcrumbs aria-label="breadcrumb" sx={{ mb: 2, ml: 2 }}>
        <Link underline="hover" color="text.primary" href="/">
          Mockten
        </Link>
        <Link
          underline="hover"
          color="text.primary"
        >
          {categoryName || 'Category'}
        </Link>
        <Typography color="text.primary">
          {productName || 'Detail'}
        </Typography>
      </Breadcrumbs>
      <ItemDetailCard
        onMetaReady={({ productName, categoryName }) => {
          setProductName(productName);
          setCategoryName(categoryName);
        }}
      />
      <DashboardBottomNavigation />
    </div>
  );
};

export default ItemDetailPage;
