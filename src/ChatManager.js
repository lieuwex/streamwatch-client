const MAX_CACHE = 800;
const FETCH_REGION = 30 * 1000;
const FETCH_MARGIN = 10 * 1000;

function makeMapFromBadges(str) {
	if (str == null) {
		return {};
	}

	const splitted = str.split(',');

	const map = {};
	for (const pair of splitted) {
		let [key, value] = pair.split('/', 2);
		if (value == null) {
			continue;
		}
		map[key] = value.replace('\\s', ' ');
	}
	return map;
}

export default class ChatManager {
	constructor(video) {
		this.video_id = video.id;

		this.session_token = null;
		this.fetched_range = [ Infinity, -Infinity ];
		this.messages = [];

		this._requestData = this._requestData.bind(this);
		this.ensureData = this.ensureData.bind(this);
		this.getBetween = this.getBetween.bind(this);
		this.clear = this.clear.bind(this);
		this.close = this.close.bind(this);
	}

	async _requestData(start, end) {
		console.info('fetching from', start, 'to', end);

		let url = `http://local.lieuwe.xyz:6070/stream/${this.video_id}/chat?start=${start}&end=${end}`;
		if (this.session_token != null) {
			url += `&session_token=${this.session_token}`;
		}

		const res = await fetch(url);
		const body = await res.json();

		this.session_token = body.session_token;

		const messages = body.res.map(s => {
			s.content.tags['badge-info'] = makeMapFromBadges(s.content.tags['badge-info']);
			s.content.tags.badges = makeMapFromBadges(s.content.tags.badges);
			s.content.ts = s.ts;
			return s.content;
		});
		if (messages.length === 0) {
			return;
		}

		let newMessages = new Map();
		for (const message of this.messages.concat(messages)) {
			const id = message.tags.id;
			if (!newMessages.has(id)) {
				newMessages.set(id, message);
			} else {
				console.debug('already have message with id', id, 'in storage. Skipping new message');
			}
		}
		newMessages = Array.from(newMessages.values());

		// TODO: we need to trim the amount of messages stored maybe not on
		// the actual count, but on the time ago the messages were fetched.
		// So that we can update fetched_range[0] accordingly. Or we could work
		// with buckets, and keep track on which fetched_range[0]
		// corresponds to which message.  But then we can only remove on
		// those bucket starts.
		//this.messages = newMessages;
		this.messages = newMessages.slice(Math.max(0, newMessages.length - MAX_CACHE), newMessages.length);

		this.onDataReady && this.onDataReady();
	}

	ensureData(start) {
		// TODO: make this better, so we can also seek before the already
		// fetched_range.

		const requiredRange = [ Math.max(start-FETCH_MARGIN, 0), start + FETCH_MARGIN ];

		if (this.fetched_range[0] <= requiredRange[0] && requiredRange[1] <= this.fetched_range[1]) {
			// nothing to do
			return;
		}

		const fetch_range = [null, null];
		// don't fetch data we already have
		fetch_range[0] = Math.max(requiredRange[0], this.fetched_range[1]);
		fetch_range[1] = fetch_range[0] + FETCH_REGION;

		// now we are ahead of ourselves, but sure
		this.fetched_range = [
			Math.min(fetch_range[0], this.fetched_range[0]),
			Math.max(fetch_range[1], this.fetched_range[1]),
		];

		this._requestData(fetch_range[0], fetch_range[1])
			.catch(e => console.error(e));
	}

	getBetween(start, end) {
		//const m = this.messages[0];
		//console.log(start, m && m.ts, end);
		return this.messages.filter(m => {
			return start <= m.ts && m.ts <= end
		});
	}

	clear() {
		this.fetched_range = [ Infinity, -Infinity ];
		this.messages = [];
	}

	close() {
		this.clear();
	}
}
