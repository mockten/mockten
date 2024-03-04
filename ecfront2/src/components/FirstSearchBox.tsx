import React from 'react';
import TextField from '@mui/material/TextField';

interface SearchBoxProps {
  value: string;
  onChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onKeyPress: (event: React.KeyboardEvent<HTMLInputElement>) => void;
}

function FirstSearchBox({ value, onChange, onKeyPress }: SearchBoxProps): JSX.Element {
  return (
    <TextField
      label="Search"
      variant="outlined"
      value={value}
      onChange={onChange}
      onKeyPress={onKeyPress}
    />
  );
}

export default FirstSearchBox;