import IconButton from '@mui/material/IconButton';
import Favorite from '@mui/icons-material/Favorite';

type Props = {
  productId: string;
};

const FavoriteButton: React.FC<Props> = ({ productId }) => {
  const handleFavoriteClick = async () => {
    try {
      const response = await fetch('/v1/item/fav', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // 必要に応じて Authorization ヘッダーも追加
          // 'Authorization': `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          product_id: productId,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to favorite item');
      }

      const result = await response.json();
      console.log('Favorite successful:', result);
    } catch (error) {
      console.error('Error favoriting item:', error);
    }
  };

  return (
    <IconButton onClick={handleFavoriteClick} color="primary">
      <Favorite />
    </IconButton>
  );
};
export default FavoriteButton;