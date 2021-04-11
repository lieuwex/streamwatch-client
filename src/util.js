export function formatTime(date) {
	return [
		date.getHours().toString().padStart(2, '0'),
		date.getMinutes().toString().padStart(2, '0'),
		date.getSeconds().toString().padStart(2, '0'),
	].join(":");
}

export function formatDuration(hours, minutes, seconds, removeLeadingZeroes = true) {
	const arr = [];

	if (hours > 0 || !removeLeadingZeroes) {
		arr.push(hours.toString().padStart(2, '0'));
		removeLeadingZeroes = false;
	}

	if (minutes > 0 || !removeLeadingZeroes) {
		arr.push(minutes.toString().padStart(2, '0'));
		removeLeadingZeroes = false;
	}

	arr.push(seconds.toString().padStart(2, '0'));

	return arr.join(":");
}

export const fetcher = (...args) => fetch(...args).then(res => res.json());

export async function updateStreamsProgress(dict) {
	const username = localStorage.getItem('username');
	if (username == null) {
		return;
	}

	await fetch(`http://local.lieuwe.xyz:6070/user/${username}/progress`, {
		method: 'PUT',
		headers: {
			'Content-Type': 'application/json',
		},
		body: JSON.stringify(dict),
	});
}

export function clamp(num, min, max) {
	return Math.min(Math.max(num, min), max);
}

export function parseDuration(duration) {
	const splitted = duration.split(':');
	return splitted
		.map((x, i) => 60**(splitted.length - i - 1) * +x)
		.reduce((a, b) => a+b);
}

export function formatGame(game) {
	let str = game.name;
	if (game.platform != null) {
		str += ` (${game.platform})`;
	}
	return str;
}

export function filterGames(games) {
	return games.filter(g => g.id !== 7);
}
