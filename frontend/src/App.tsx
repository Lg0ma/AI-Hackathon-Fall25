import React, { useState } from 'react';
import InitialScreen from './components/InitialScreen';
import CreateAccount from './components/CreateAccount';
import './App.css';

function App() {
  const [isCreatingAccount, setCreatingAccount] = useState(false);

  return (
    <div className="App">
      {isCreatingAccount ? (
        <CreateAccount setCreatingAccount={setCreatingAccount} />
      ) : (
        <InitialScreen setCreatingAccount={setCreatingAccount} />
      )}
    </div>
  );
}

export default App;
