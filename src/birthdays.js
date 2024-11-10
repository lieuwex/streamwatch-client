import { DateTime } from 'luxon';

import './birthdays.css';

const birthdays = {
	'bart': { day: 11, month: 11 },
	'lieuwe': { day: 18, month: 9 },
};

window.requestIdleCallback(() => {
	const username = localStorage.getItem('username') ?? '';

	const b = birthdays[username];
	if (b == null) {
		return;
	}

	const d = DateTime.now();
	if (d.month !== b.month || d.day !== b.day) {
		return;
	}

	document.body.classList.add('birthday');
	document.body.classList.add(username);
});
