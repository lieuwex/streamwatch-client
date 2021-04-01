const MAX_CACHE = 800;
const FETCH_REGION = 30 * 1000;
const FETCH_MARGIN = 10 * 1000;

export default class ChatManager {
	constructor(video) {
		this.clip_start = video.timestamp;

		this.id = 0;
		this.fetched_range = [ Infinity, -Infinity ];
		this.messages = [];

		this.ws = new WebSocket(`ws://local.lieuwe.xyz:6070/stream/${video.id}/chat`);
		this.ws.onmessage = (e) => {
			const messages = JSON.parse(e.data).res.map(s => ({ ...JSON.parse(s.content), ts: s.ts }));
			if (messages.length == 0) {
				return;
			}

			const seen = new Set();
			const newMessages = [];
			for (const message of this.messages.concat(messages)) {
				if (!seen.has(message.tags.id)) {
					seen.add(message.tags.id);
					newMessages.push(message);
				}
			}

			// TODO: we need to trim the amount of messages stored maybe not on
			// the actual count, but on the time ago the messages were fetched.
			// So that we can update fetched_range[0] accordingly. Or we could work
			// with buckets, and keep track on which fetched_range[0]
			// corresponds to which message.  But then we can only remove on
			// those bucket starts.
			//this.messages = newMessages;
			this.messages = newMessages.slice(Math.max(0, newMessages.length - MAX_CACHE), newMessages.length);

			this.onDataReady && this.onDataReady();
		};

		this.ensureData = this.ensureData.bind(this);
		this.getBetween = this.getBetween.bind(this);
		this.clear = this.clear.bind(this);
		this.close = this.close.bind(this);
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

		let handle;
		if (this.ws.readyState === 1) {
			handle = (cb) => cb();
		} else {
			handle = (cb) => {
				this.ws.opnopen = cb.bind(this);
			};
		}

		handle(() => {
			console.log('fetching from', fetch_range[0], 'to', fetch_range[1]);
			this.ws.send(JSON.stringify({
				id: this.id++,
				start: fetch_range[0],
				end: fetch_range[1],
			}));
		});
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
		this.ws.close();
	}
}
