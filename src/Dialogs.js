import PersonsDialog from './dialogs/PersonsDialog.js';
import GamesDialog from './dialogs/GamesDialog.js';
import MetadataDialog from './dialogs/MetadataDialog.js';
import Clipper from './dialogs/Clipper.js';

export default function PlayerDialog(props) {
	if (props.type === 'participants') {
		return <PersonsDialog handleClose={props.handleClose} video={props.video} />;
	} else if (props.type === 'games') {
		return <GamesDialog handleClose={props.handleClose} video={props.video} currentTime={props.currentTime} />;
	} else if (props.type === 'metadata') {
		return <MetadataDialog handleClose={props.handleClose} video={props.video} currentTime={props.currentTime} />;
	} else if (props.type === 'clipper') {
		return <Clipper handleClose={props.handleClose} video={props.video} clip={props.clip} currentTime={props.currentTime} />;
	}

	return <></>;
};
