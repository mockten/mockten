import React from 'react';
import axios from 'axios';
import BottomNavigation from '@mui/material/BottomNavigation';

function DashboardBottomNavigation() {
  const [value, setValue] = React.useState(0);

  const handleIconClick = (apiEndpoint: string) => {
    axios.get(`http://your-backend-url/service/${apiEndpoint}`)
      .then(response => {
        console.log(response.data);
      })
      .catch(error => {
        console.error('There was an error fetching the data!', error);
      });
  };

  return (
    <BottomNavigation
      value={value}
      onChange={(event, newValue) => {
        setValue(newValue);
      }}
    >
      <div>
        About Us
        Help Center
        Claim
      </div>
    </BottomNavigation>
  );
}

export default DashboardBottomNavigation;