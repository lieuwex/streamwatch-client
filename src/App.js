import {
	BrowserRouter as Router,
	Switch,
	Route,
} from 'react-router-dom';
import React from 'react';
import swr from 'swr';

import './App.css';

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

function App() {
	const { data, error } = swr('http://local.lieuwe.xyz:6070/streams', fetcher);

	if (error) {
		return <div>Error while loading streams</div>;
	} else if (!data) {
		return <Loading />;
	}

	const streams = data.sort((a, b) => b.timestamp - a.timestamp);
	for (let stream of streams) {
		// TODO
		stream.timestamp -= 3600;
		stream.timestamp *= 1000;
	}

	return (
		<Router>
			<Switch>
				<Route path="/video/:id">
					<Player videos={streams}/>
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
