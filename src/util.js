import { useEffect } from 'react';
import { mutate } from 'swr';
import { isChrome, isChromium, isEdgeChromium } from 'react-device-detect';

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
	const password = localStorage.getItem('password') || '';

	await fetch(`https://streams.lieuwe.xyz/api/user/${username}/progress?password=${password}`, {
		method: 'PUT',
		headers: {
			'Content-Type': 'application/json',
		},
		body: JSON.stringify(dict),
	});
	mutate(`https://streams.lieuwe.xyz/api/user/${username}/progress`);
}

export async function addClipView(clipId) {
	const username = localStorage.getItem('username') || '';
	const password = localStorage.getItem('password') || '';

	await fetch(`https://streams.lieuwe.xyz/api/clips/${clipId}/view?username=${username}&password=${password}`, {
		method: 'POST',
	});
	// TODO: mutate
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
		//str += ` (${game.platform})`;
	}
	return str;
}

export function filterGames(games) {
	return games.filter(g => g.id !== 7);
}

export function formatDate(date) {
	if (date == null) {
		return date;
	}
	return date.toFormat('yyyy-MM-dd HH:mm:ss');
}

export function getCurrentDatapoint(video, progressFrac) {
	let res = null;

	for (const datapoint of video.datapoints) {
		const fract = (datapoint.timestamp - video.timestamp) / video.duration;
		if (progressFrac >= fract) {
			res = datapoint;
		}
	}

	return res;
}

export function getTitle(video, includeGames, progressFrac = null) {
	let dp = null;
	if (video.title_type === 'datapoint' && progressFrac != null) {
		dp = getCurrentDatapoint(video, progressFrac);
	}

	if (dp != null) {
		return [dp.title, true];
	} else if (video.title != null && (includeGames || video.title_type !== 'games')) {
		return [video.title, true];
	}

	const title = video.file_name.split('.');
	title.pop();
	return [title.join('.'), false];
}

export function getCurrentUrl() {
	return new URL(window.location.href);
}

export function plural(count, singular, plural) {
	if (Math.abs(count) === 1) {
		return singular;
	} else {
		return plural;
	}
}

export function isChromeLike() {
	return isChrome || isChromium || isEdgeChromium;
}

async function getIP() {
	const res = await fetch('https://httpbin.org/get');
	const json = await res.json();
	return json.origin;
}

async function sendVisit() {
	let ip = null;
	try {
		ip = await getIP();
	} catch (error) {
		console.warn('error while fetching IP', error);
	}

	await fetch('https://streams.lieuwe.xyz/api/visit', {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
		},

		body: JSON.stringify({
			user_agent: window.navigator.userAgent,
			ip_address: ip,
			href: document.location.href,
			username: localStorage.getItem('username'),
		}),
	});
}

export function useRequireLogin(requireLogin = true) {
	// check if login is required, if so, redirect
	useEffect(() => {
		if (requireLogin && localStorage.getItem('username') == null) {
			sessionStorage.setItem('redirect', window.location.href);
			window.location.href = '/login';
		}
	}, [requireLogin]);

	// send route information to server for tracking purposes
	useEffect(() => { sendVisit() }, []);
}

export function setCookies() {
	const username = localStorage.getItem('username') || '';
	const password = localStorage.getItem('password') || '';

	document.cookie = `username=${username}`;
	document.cookie = `password=${password}`;
}
