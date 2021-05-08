import React from 'react';
import ReactDOM from 'react-dom';
import './index.css';
import App from './App';

import migrate from './migrations.js';

ReactDOM.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
  document.getElementById('root')
);

window.requestIdleCallback(() => {
	migrate().catch(e => console.error(e));
});
