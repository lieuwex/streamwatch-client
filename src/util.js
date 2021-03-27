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
