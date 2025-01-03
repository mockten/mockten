import { useEffect, useState } from 'react';
import IconButton from '@mui/material/IconButton';
import FavoriteIcon from '@mui/icons-material/Favorite';
import Badge from '@mui/material/Badge';
import { useNavigate } from 'react-router-dom';

interface Favorite {
  amount: number;
}


function AppbarFavoriteIcon() {
  const [favoriteAmount, setFavoriteAmount] = useState<number>();
  const navigate = useNavigate();

  // const apiUrl = process.env.REACT_APP_ACCOUNT_API;
  const apiUrl = 'http://localhost:8080';

  const handleIconClick = () => {
    navigate('/fav/list');
    // window.open('/fav/list', '_blank');
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch(`${apiUrl}/v1/fav/amount?`, {
          method: 'GET',
          headers: {
              'Content-Type': 'application/json'
          }
        });
        const favo: Favorite = await response.json();
        setFavoriteAmount(favo.amount);
      } catch (error) {
        console.error('Error fetching the amount favorites of my cart:', error);
      }
    };

    fetchData();
  }, []);

  return (
    <div>
      <IconButton onClick={() => handleIconClick()} size="large" aria-label="show new favorites" color="inherit">
        <Badge badgeContent={favoriteAmount} color="error">
          <FavoriteIcon />
        </Badge>
      </IconButton>
    </div>
  );
}

export default AppbarFavoriteIcon;