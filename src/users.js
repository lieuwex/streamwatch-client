export const users = {
	'lieuwe': 'Lieuwe',
	'bart': 'Bart',
	'lisanne': 'Lisanne',
	'marente': 'Marente',
	'daan': 'Daan',
	'mees': 'Mees',
	'victor': 'Victor',
};

export function getName(username) {
	return users[username] ?? username;
}
