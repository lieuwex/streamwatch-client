export const users = {
	'lieuwe': 'Lieuwe',
	'bart': 'Bart',
	'lisanne': 'Lisanne',
	'marente': 'Marente',
	'daan': 'Daan',
	'mark': 'Mark',
	'luuk': 'Luuk',
};

export function getName(username) {
	return users[username] ?? username;
}

const twitchMappings = {
	'lieuwe': 'lieuwex',
	'bart': 'genotsknots',
};

export function getTwitchName(username) {
	return twitchMappings[username] ?? username;
}
