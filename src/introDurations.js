function getIntroDuration(videoId) {
	return {
		1339: 10,
	}[videoId] ?? 43;
}

export function getSkipTo(video, progressSecs) {
	const introDuration = getIntroDuration(video.id); // seconds
	const lekkerWachtens = video.games.filter(g => g.id === 7);

	if (lekkerWachtens.length === 0 && progressSecs < introDuration) {
		return introDuration;
	}

	for (let i = lekkerWachtens.length - 1; i >= 0; i--) {
		const start = lekkerWachtens[i].start_time;
		if (progressSecs > start && progressSecs < (start + introDuration)) {
			return start + introDuration;
		}
	}

	return null;
}
