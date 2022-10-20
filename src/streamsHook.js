import { DateTime } from 'luxon';
import swr from 'swr';

import { fetcher } from './util.js';

function mapStreams(streams) {
	for (let stream of streams) {
		stream.date = DateTime.fromSeconds(stream.timestamp);
		stream.addedDate = stream.inserted_at ? DateTime.fromSeconds(stream.inserted_at) : null;
	}
	return streams;
}

function videoInProgress(video) {
	return video.progress != null
		&& video.progress.time > 60
		&& video.duration - video.progress.time >= 30;
}

export default function useStreams() {
	let { data: streamsData, error: streamsError } = swr('http://local.lieuwe.xyz:6070/api/streams', fetcher);
	const streamsLoading = streamsData == null && streamsError == null;
	if (streamsError != null) {
		console.warn('error while loading streams', streamsError);
	}
	streamsData = mapStreams(streamsData || []);

	let { data: clipsData, error: clipsError } = swr('http://local.lieuwe.xyz:6070/api/clips', fetcher);
	const clipsLoading = clipsData == null && clipsError == null;
	if (clipsError != null) {
		console.warn('error while loading clips', clipsError);
	}
	clipsData = clipsData || [];

	const username = localStorage.getItem('username');
	const password = localStorage.getItem('password') || '';
	let { data: progressData, error: progressError } = swr(username != null ? `http://local.lieuwe.xyz:6070/api/user/${username}/progress?password=${password}` : null, fetcher);
	const progressLoading = username != null && progressData == null && progressError == null;
	if (progressError != null) {
		console.warn('error while loading user progress', progressError);
	}
	progressData = progressData || {};

	// REVIEW: optimize complexity

	for (let stream of streamsData) {
		stream.progress = progressData[stream.id];
		stream.inProgress = videoInProgress(stream);
	}

	for (let clip of clipsData) {
		clip.stream = streamsData.find(s => s.id === clip.stream_id);
	}

	return {
		isLoading: streamsLoading || clipsLoading || progressLoading,

		clips: [ clipsData, clipsError ],
		streams: [ streamsData, streamsError ],
	}
}
