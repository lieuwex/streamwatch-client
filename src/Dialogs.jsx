import { lazy, Suspense } from 'react';

import Loading from './Loading';
const PersonsDialog = lazy(() => import('./dialogs/PersonsDialog'));
const GamesDialog = lazy(() => import('./dialogs/GamesDialog'));
const MetadataDialog = lazy(() => import('./dialogs/MetadataDialog'));
const Clipper = lazy(() => import('./dialogs/Clipper'));

export default function PlayerDialog(props) {
	let el = <></>;
	if (props.type === 'participants') {
		el = <PersonsDialog {...props} />;
	} else if (props.type === 'games') {
		el = <GamesDialog {...props} />;
	} else if (props.type === 'metadata') {
		el = <MetadataDialog {...props} />;
	} else if (props.type === 'clipper') {
		el = <Clipper {...props} />;
	}

	return <Suspense fallback={<Loading />}>
		{el}
	</Suspense>;
};
