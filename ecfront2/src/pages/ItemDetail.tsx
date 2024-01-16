import React from 'react';
import { useParams } from 'react-router-dom';
import ItemDetail from '../components/ItemDetail';

const ItemDetailsPage: React.FC = () => {
    const { itemId } = useParams<{ itemId: string }>();

    return (
        <div className="item-details-page">
            <h2>Item Details Page</h2>
            <ItemDetail itemId={Number(itemId)} />
        </div>
    );
};

export default ItemDetailsPage;