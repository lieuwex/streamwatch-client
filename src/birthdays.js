import { DateTime } from 'luxon';

import './birthdays.css';

window.requestIdleCallback(() => {
	const username = localStorage.getItem('username') || '';
	if (username !== 'bart') {
		return;
	}

	const d = DateTime.now();
	if (d.month !== 11 || d.day !== 11) {
		return;
	}

	document.body.classList.add('birthday');
	document.body.classList.add('bart');
});
