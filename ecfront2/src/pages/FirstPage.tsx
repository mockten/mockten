
import React, { useState } from 'react';
import SearchBox from '../components/FirstSearchBox';
import { CircularProgress, Typography, List, ListItem } from '@mui/material';


interface Product {
    product_id: string;
    product_name: string;
    seller_name: string;
    category: number;
    price: number;
    ranking: number;
    stocks: number;
    main_url: string;
}

interface SearchApiResponse {
    products: Product[];
    page: number;
}


function App(): JSX.Element {
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const sendSearchQuery = async (query: string): Promise<void> => {
    const apiUrl = process.env.REACT_APP_SEARCH_API;
    // const apiUrl = 'https://exampl.com/api';

    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${apiUrl}/endpoint?q=${query}&p=1&t=hoge`, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
          throw new Error('Network response was not ok');
      }
      const data: SearchApiResponse = await response.json();
      setProducts(data.products);
      setLoading(false);

    } catch (error) {
      console.error('There was a problem with your fetch operation:', error);
      setError('Failed to fetch data');
      setLoading(false);
    }
    
  }

  const handleSearchEnter = (event: React.KeyboardEvent<HTMLInputElement>): void => {
    if (event.key === 'Enter') {
      sendSearchQuery(searchQuery);
    }
  };

  return (
    <div>
      <h1>Welcome to Mockten!</h1>
      <SearchBox
        value={searchQuery}
        onChange={(event) => setSearchQuery(event.target.value)}
        onKeyPress={handleSearchEnter}
      />
      {loading && <CircularProgress />}
      {error && <Typography color="error">{error}</Typography>}
      <List>
          {products.map(product => (
              <ListItem key={product.product_id}>{product.product_name}</ListItem>
          ))}
      </List>
    </div>
  );
}

export default App;