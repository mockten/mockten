import { useEffect, useState } from 'react';
import IconButton from '@mui/material/IconButton';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import Badge from '@mui/material/Badge';
import { useNavigate } from 'react-router-dom';

interface Cart {
  amount: number;
}


function AppbarShoppingCartIcon() {
  const [cartAmount, setCartAmount] = useState<number>();
  const navigate = useNavigate();

  // const apiUrl = process.env.REACT_APP_ACCOUNT_API;
  const apiUrl = 'http://localhost:8080';

  const handleIconClick = () => {
    navigate('/cart/list');
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch(`${apiUrl}/v1/cart/amount?`, {
          method: 'GET',
          headers: {
              'Content-Type': 'application/json'
          }
        });
        const cart: Cart = await response.json();
        setCartAmount(cart.amount);
      } catch (error) {
        console.error('Error fetching the amount itemsof my cart:', error);
      }
    };

    fetchData();
  }, []);

  return (
    <div>
      <IconButton onClick={() => handleIconClick()} size="large" aria-label="show 4 new mails" color="inherit">
        <Badge badgeContent={cartAmount} color="error">
          <ShoppingCartIcon />
        </Badge>
      </IconButton>
    </div>
  );
}

export default AppbarShoppingCartIcon;