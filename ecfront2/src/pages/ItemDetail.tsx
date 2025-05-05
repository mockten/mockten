import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';


type ItemDetailType = {
    product_id: string;
    product_name: string;
    seller_name: string;
    category: number;
    price: number;
    ranking: number;
    stocks: number;
    main_url: string;
  };
  

const ItemDetailsPage: React.FC = () => {

    const { id } = useParams<{ id: string }>();
    const [item, setItem] = useState<ItemDetailType | null>(null);
  
    useEffect(() => {
      const fetchItemDetail = async () => {
        try {
          const response = await fetch(`/v1/item/detail?id=${id}`);
          if (!response.ok) {
            throw new Error('Failed to fetch item details');
          }
          const data = await response.json();
          setItem(data);
        } catch (error) {
          console.error('Error fetching item detail:', error);
        }
      };
  
      if (id) {
        fetchItemDetail();
      }
    }, [id]);
  
    if (!item) {
      return <p>Loading...</p>;
    }
  
    return (
      <div>
        <h2>{item.product_name}</h2>
        <p>Seller: {item.seller_name}</p>
        <p>Category: {item.category}</p>
        <p>Price: ¥{item.price}</p>
        <p>Ranking: {item.ranking}</p>
        <p>Stocks: {item.stocks}</p>
        <img src={item.main_url} alt={item.product_name} width={300} />
      </div>
    );
  };

export default ItemDetailsPage;