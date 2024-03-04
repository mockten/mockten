export function sendSearchQuery(query: string): void {
    const apiUrl = 'https://example.com/api';

    fetch(`${apiUrl}/endpoint?${query}`)
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