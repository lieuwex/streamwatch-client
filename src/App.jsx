import {
	createBrowserRouter,
	ScrollRestoration,
	RouterProvider,
	Routes,
	Route,
} from 'react-router-dom';
import React from 'react';

import Videos from './Videos';
import Clips from './Clips';
import Player from './Player';
import Login from './Login';
import SelectWatchparty from './SelectWatchparty';

const router = createBrowserRouter([
	{ path: '*', Component: Root },
]);

export default function App() {
	return <RouterProvider router={router} />;
}

function Root() {
	return (
		<>
			<ScrollRestoration />
			<Routes>
				<Route path="/video/:id" element={<Player isClip={false} />} />
				<Route path="/clip/:id" element={<Player isClip={true} />} />
				<Route path="/watchparty" element={<SelectWatchparty />} />
				<Route path="/clips" element={<Clips />} />
				<Route path="/login" element={<Login />} />
				<Route path="/" element={<Videos />} />
			</Routes>
		</>
	);
}
