import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import './styleOptions.css';
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

window.requestIdleCallback(() => {
	const json = JSON.parse(localStorage.getItem('styleOptions') || '[]');
	for (const className of json) {
		document.body.classList.add(className);
	}
})
