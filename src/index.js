import 'core-js/actual';

import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import './styleOptions.css';
import App from './App';

import migrate from './migrations.js';

if (window.location.hostname === 'local.lieuwe.xyz') {
	const url = window.location.href.replace('http://local.lieuwe.xyz:6070/', 'https://streams.lieuwe.xyz/');
	window.location.replace(url);
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(App());

window.requestIdleCallback(() => {
	migrate().catch(e => console.error(e));
});

window.requestIdleCallback(() => {
	const json = JSON.parse(localStorage.getItem('styleOptions') || '[]');
	for (const className of json) {
		document.body.classList.add(className);
	}
})
