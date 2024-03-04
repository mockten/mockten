
import React, { useState } from 'react';
import SearchBox from '../components/FirstSearchBox';
import { sendSearchQuery } from '../api/searchApi'; // バックエンドAPIとの通信を担当する関数

function App(): JSX.Element {
  const [searchQuery, setSearchQuery] = useState<string>('');

  const handleSearchEnter = (event: React.KeyboardEvent<HTMLInputElement>): void => {
    if (event.key === 'Enter') {
      sendSearchQuery(searchQuery);
    }
  };

  return (
    <div>
      <h1>Welcome to My Search App!</h1>
      <SearchBox
        value={searchQuery}
        onChange={(event) => setSearchQuery(event.target.value)}
        onKeyPress={handleSearchEnter}
      />
    </div>
  );
}

export default App;