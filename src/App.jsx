import {
	createBrowserRouter,
	ScrollRestoration,
	RouterProvider,
	Routes,
	Route,
} from 'react-router-dom';
import { lazy, Suspense } from 'react';

import Loading from './Loading';

const Videos = lazy(() => import('./Videos'));
const Clips = lazy(() => import('./Clips'));
const Player = lazy(() => import('./Player'));
const Login = lazy(() => import('./Login'));
const SelectWatchparty = lazy(() => import('./SelectWatchparty'));

const router = createBrowserRouter([
	{ path: '*', Component: Root },
]);

export default function App() {
	return <RouterProvider router={router} />;
}

function Root() {
	return (
		<Suspense fallback={<Loading />}>
			<ScrollRestoration />
			<Routes>
				<Route path="/video/:id" element={<Player isClip={false} />} />
				<Route path="/clip/:id" element={<Player isClip={true} />} />
				<Route path="/watchparty" element={<SelectWatchparty />} />
				<Route path="/clips" element={<Clips />} />
				<Route path="/login" element={<Login />} />
				<Route path="/" element={<Videos />} />
			</Routes>
		</Suspense>
	);
}
