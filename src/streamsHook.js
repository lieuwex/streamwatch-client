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

function mapClips(clips) {
	for (let clip of clips) {
		// HACK
		if (clip._start_time == null) {
			clip._start_time = clip.start_time;
			clip._duration = clip.duration;
		}

		clip.start_time = clip._start_time / 1e3;
		clip.duration = clip._duration / 1e3;
	}
	return clips;
}

function videoInProgress(video) {
	return video.progress != null
		&& video.progress.time > 60
		&& video.duration - video.progress.time >= 30;
}

export default function useStreams() {
	const username = localStorage.getItem('username');
	const password = localStorage.getItem('password') || '';

	let { data: streamsData, error: streamsError } = swr('https://streams.lieuwe.xyz/api/streams', fetcher);
	const streamsLoading = streamsData == null && streamsError == null;
	if (streamsError != null) {
		console.warn('error while loading streams', streamsError);
	}
	streamsData = mapStreams(streamsData || []);

	let { data: clipsData, error: clipsError } = swr(`https://streams.lieuwe.xyz/api/clips?username=${username || ''}&password=${password}`, fetcher);
	const clipsLoading = clipsData == null && clipsError == null;
	if (clipsError != null) {
		console.warn('error while loading clips', clipsError);
	}
	clipsData = mapClips(clipsData || []);

	let { data: progressData, error: progressError } = swr(username != null ? `https://streams.lieuwe.xyz/api/user/${username}/progress?password=${password}` : null, fetcher);
	const progressLoading = username != null && progressData == null && progressError == null;
	if (progressError != null) {
		console.warn('error while loading user progress', progressError);
	}
	progressData = progressData || {};

	// REVIEW: optimize complexity

	for (let stream of streamsData) {
		stream.progress = progressData[stream.id];
		stream.finished = stream.progress != null && stream.duration - stream.progress.time < 30;
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
