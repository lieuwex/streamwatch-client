import { fetcher, updateStreamsProgress } from './util.js';

const migrations = [
	async function() {
		const streams = await fetcher('http://local.lieuwe.xyz:6070/streams');

		const dict = {};
		for (const stream of streams) {
			const percentage = localStorage.getItem(`progress_${stream.id}`);
			if (percentage == null) continue;
			dict[stream.id] = percentage * stream.duration;
		}

		await updateStreamsProgress(dict);
	},
];

export default async function migrate() {
	const curr = localStorage.getItem('data_version') || 0;

	for (let i = curr; i < migrations.length; i++) {
		console.info('running migration', i, 'to', i+1);
		await migrations[i]();
		localStorage.setItem('data_version', i+1);
	}
}
