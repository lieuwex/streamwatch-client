export const users = {
	'lieuwe': 'Lieuwe',
	'bart': 'Bart',
	'lisanne': 'Lisanne',
	'marente': 'Marente',
	'daan': 'Daan',
	'mark': 'Mark',
};

export function getName(username) {
	return users[username] ?? username;
}
