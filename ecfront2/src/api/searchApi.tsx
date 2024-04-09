export function sendSearchQuery(query: string): void {
    const apiUrl = process.env.REACT_APP_SEARCH_API;
    // const apiUrl = 'https://exampl.com/api';

    fetch(`${apiUrl}/endpoint?q=${query}&p=1&t=hoge`)
    .then(response => {
        if (!response.ok) {
        throw new Error('Network response was not ok');
        }
        return response.json();
    })
    .then(data => {
        console.log(data);
    })
    .catch(error => {
        console.error('There was a problem with your fetch operation:', error);
    });
}