import emoticons from './emoticons.json';

let regexpStr = '\\b(';
let n = 0;
for (const regex of Object.keys(emoticons)) {
	// TODO: escape regex

	if (n > 0) regexpStr += '|';
	n++;

	regexpStr += regex;
}
regexpStr += ')\\b';

const re = new RegExp(regexpStr, 'ig');

export function matchEmoticons(str) {
	return Array.from(str.matchAll(re)).map(m => {
		const name = m[1];
		return {
			name,
			start: m.index,
			end: m.index + name.length,
			id: emoticons[name],
		};
	});
}

export function getTwitchEmoticon(id, theme='dark') {
	return {
		url: `https://static-cdn.jtvnw.net/emoticons/v2/${id}/default/${theme}/4.0`,
		width: 112,
		height: 112,
	};
}

export function convertEmotes(str, emotes, map) {
	const res = [];
	let last = 0;

	for (const emote of emotes) {
		const start = map?.[emote.start] ?? emote.start;
		const end = map?.[emote.end] ?? emote.end;

		if (last < start) {
			res.push(str.slice(last, start));
		}

		const content = str.slice(start, end);
		const { url, width, height } = getTwitchEmoticon(emote.id);
		res.push(`<img alt="${content}" title="${content}" src="${url}" width="${width}" height="${height}" decoding="sync"/>`);

		last = end;
	}

	if (last < str.length) {
		res.push(str.slice(last));
	}

	return res.join('');
}

export function clipTitleRename(title) {
	const emotes = matchEmoticons(title);
	return convertEmotes(title, emotes, null);
}
