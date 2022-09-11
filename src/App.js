import {
	BrowserRouter as Router,
	Routes,
	Route,
} from 'react-router-dom';
import React from 'react';

import Videos from './Videos.js';
import Clips from './Clips.js';
import Player from './Player.js';
import Login from './Login.js';
import SelectWatchparty from './SelectWatchparty.js';

function App() {
	return (
		<Router>
			<Routes>
				<Route path="/video/:id" element={<Player isClip={false} />} />
				<Route path="/clip/:id" element={<Player isClip={true} />} />
				<Route path="/watchparty" element={<SelectWatchparty />} />
				<Route path="/clips" element={<Clips />} />
				<Route path="/login" element={<Login />} />
				<Route path="/" element={<Videos />} />
			</Routes>
		</Router>
	);
}

export default App;
