import React from 'react';
import ReactDOM from 'react-dom';
import './index.css';
import App from './App';

import migrate from './migrations.js';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
	<React.StrictMode>
	<App />
	</React.StrictMode>,
);

window.requestIdleCallback(() => {
	migrate().catch(e => console.error(e));
});
