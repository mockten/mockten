import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { styled, alpha } from '@mui/material/styles';
import InputBase from '@mui/material/InputBase';
import SearchIcon from '@mui/icons-material/Search';

const Search = styled('div')(({ theme }) => ({
    position: 'relative',
    borderRadius: theme.shape.borderRadius,
    backgroundColor: alpha(theme.palette.common.white, 0.15),
    '&:hover': {
      backgroundColor: alpha(theme.palette.common.white, 0.25),
    },
    marginRight: theme.spacing(2),
    marginLeft: 0,
    width: '100%',
    [theme.breakpoints.up('sm')]: {
      marginLeft: theme.spacing(3),
      width: 'auto',
    },
  }));
  
const SearchIconWrapper = styled('div')(({ theme }) => ({
    padding: theme.spacing(0, 2),
    height: '100%',
    position: 'absolute',
    pointerEvents: 'none',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
}));

const StyledInputBase = styled(InputBase)(({ theme }) => ({
    color: 'inherit',
    '& .MuiInputBase-input': {
    padding: theme.spacing(1, 1, 1, 0),
    // vertical padding + font size from searchIcon
    paddingLeft: `calc(1em + ${theme.spacing(4)})`,
    transition: theme.transitions.create('width'),
    width: '100%',
    [theme.breakpoints.up('md')]: {
        width: '20ch',
    },
    },
}));

function AppbarSearchBox() {
    const [searchQuery, setSearchQuery] = useState('');
    const navigate = useNavigate();

  
    const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
      setSearchQuery(event.target.value);
    };

    const handleKeyPress = async (event: React.KeyboardEvent<HTMLInputElement>) => {
      if (event.key === 'Enter') {
        try {
          const response = await fetch(`/v1/search?q=${encodeURIComponent(searchQuery)}&p=1`);
          if (!response.ok) {
            throw new Error('Search failed');
          }
          const data = await response.json();
          console.log(data);
          navigate('/search', {
            state: {
              data: data,
            },
          });
        } catch (error) {
          console.error('Error fetching search results:', error);
        }
     }
    };

    
    return (
        <div>
            <Search>
                <SearchIconWrapper>
                    <SearchIcon />
                </SearchIconWrapper>
                <StyledInputBase
                    value={searchQuery}
                    onChange={handleChange}
                    onKeyPress={handleKeyPress}
                    placeholder="Search Item..."
                    inputProps={{ 'aria-label': 'search' }}
                />
            </Search>
        </div>
    );
}

export default AppbarSearchBox;
