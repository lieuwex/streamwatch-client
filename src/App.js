import {
	BrowserRouter as Router,
	Switch,
	Route,
} from 'react-router-dom';
import React from 'react';
import swr from 'swr';
import 'typeface-inter';

import Videos from './Videos.js';
import Player from './Player.js';
import Login from './Login.js';
import Loading from './Loading.js';
import { fetcher } from './util.js';

import { EmoteFetcher, EmoteParser } from '@mkody/twitch-emoticons';

window.twitchFetcher = new EmoteFetcher();
window.twitchParser = new EmoteParser(window.twitchFetcher, {
	type: 'html',
	match: /(\w+)/ig,
});
setTimeout(() => {
	window.twitchFetcher.fetchTwitchEmotes();
	window.twitchFetcher.fetchTwitchEmotes(52385053);
}, 0);

async function streamsFetcher(...args) {
	const res = await fetch(...args);
	const streams = await res.json();
	for (let stream of streams) {
		// TODO
		stream.timestamp *= 1000;
	}
	return streams;
}

function videoInProgress(video) {
	return video.progress != null
		&& video.progress > 60
		&& video.duration - video.progress >= 30;
}

function App() {
	const { data: streamsData, error: streamsError } = swr('http://local.lieuwe.xyz:6070/streams', streamsFetcher);
	const username = localStorage.getItem('username');
	let { data: progressData, error: progressError } = swr(username != null ? `http://local.lieuwe.xyz:6070/user/${username}/progress` : null, fetcher);

	if (streamsError) {
		return <div>Error while loading streams</div>;
	} else if (!streamsData) {
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

	const streams = streamsData.sort((a, b) => {
		return b.timestamp - a.timestamp;
	});

	return (
		<Router>
			<Switch>
				<Route path="/video/:id">
					<Player videos={streams} />
				</Route>
				<Route path="/login">
					<Login />
				</Route>
				<Route path="/">
					<Videos videos={streams} />
				</Route>
			</Switch>
		</Router>
	);
}

export default App;
