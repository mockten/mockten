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

export async function sendSearchQuery(query: string): Promise<SearchApiResponse> {
    const apiUrl = process.env.REACT_APP_SEARCH_API;
    // const apiUrl = 'https://exampl.com/api'
    
    return fetch(`${apiUrl}/endpoint?q=${query}&p=1&t=hoge`, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json'
        }
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        return response.json() as Promise<SearchApiResponse>;
    })
    .then(data => {
        console.log(data.products[0].product_name);
        return data;
    })
    .catch(error => {
        console.error('There was a problem with your fetch operation:', error);
        throw error;
    });
}