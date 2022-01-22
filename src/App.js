import {
	BrowserRouter as Router,
	Routes,
	Route,
} from 'react-router-dom';
import React from 'react';
import swr from 'swr';
import 'typeface-inter';
import { DateTime } from 'luxon';

import Videos from './Videos.js';
import Player from './Player.js';
import Login from './Login.js';
import Loading from './Loading.js';
import SelectWatchparty from './SelectWatchparty.js';
import { fetcher } from './util.js';

async function streamsFetcher(...args) {
	const res = await fetch(...args);
	const streams = await res.json();
	for (let stream of streams) {
		stream.date = DateTime.fromSeconds(stream.timestamp);
	}
	return streams;
}

function videoInProgress(video) {
	return video.progress != null
		&& video.progress.time > 60
		&& video.duration - video.progress.time >= 30;
}

function App() {
	const { data: streamsData, error: streamsError } = swr('http://local.lieuwe.xyz:6070/streams', streamsFetcher);
	const { data: clipsData, error: clipsError } = swr('http://local.lieuwe.xyz:6070/clips', fetcher);
	const username = localStorage.getItem('username');
	let { data: progressData, error: progressError } = swr(username != null ? `http://local.lieuwe.xyz:6070/user/${username}/progress` : null, fetcher);

	if (streamsError) {
		console.error('error while loading streams', streamsError);
		return <div>Error while loading streams</div>;
	} else if (!streamsData) {
		return <Loading heavyLoad={true} />;
	}

	if (clipsError) {
		console.error('error while loading clips', clipsError);
		return <div>Error while loading clips</div>;
	} else if (!clipsData) {
		return <Loading heavyLoad={true} />;
	}

	if (progressError || username == null) {
		progressData = {};
	} else if (!progressData) {
		return <Loading heavyLoad={true} />;
	}

	for (let stream of streamsData) {
		stream.progress = progressData[stream.id];
		stream.inProgress = videoInProgress(stream);
	}

	const streams = streamsData;
	const clips = clipsData;

	return (
		<Router>
			<Routes>
				<Route path="/video/:id" element={<Player videos={streams} clips={clips} isClip={false} />} />
				<Route path="/clip/:id" element={<Player videos={streams} clips={clips} isClip={true} />} />
				<Route path="/watchparty" element={<SelectWatchparty />} />
				<Route path="/login" element={<Login />} />
				<Route path="/" element={<Videos videos={streams} clips={clips} />} />
			</Routes>
		</Router>
	);
}

export default App;
