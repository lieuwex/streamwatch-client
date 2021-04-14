import Backdrop from '@material-ui/core/Backdrop';
import CircularProgress from '@material-ui/core/CircularProgress';

function Loading({ heavyLoad = false }) {
	return (
		<Backdrop open={true} invisible={true}>
			<CircularProgress disableShrink={heavyLoad} />
		</Backdrop>
	);
}

export default Loading;
