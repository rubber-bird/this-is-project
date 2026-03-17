import { useEffect, useState } from 'react';

import './App.css';

import { getServerInfo } from './api'

function App() {
  const [version, setVersion] = useState('N/A');

  useEffect(() => {
    const data = getServerInfo();

    data.then((info) => {
      setVersion(info.php_version);
    });
  }, []);

  return (
    <>
      <section id="center">
        <div className="card">
          <h1>CSC 350 - Project 1</h1>
          <p>Server Info: {version}</p>
        </div>
      </section>
    </>
  )
}

export default App
