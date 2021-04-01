import Backdrop from '@material-ui/core/Backdrop';
import CircularProgress from '@material-ui/core/CircularProgress';

function Loading() {
	return (
		<Backdrop open={true} invisible={true}>
			<CircularProgress disableShrink />
		</Backdrop>
	);
}

export default Loading;
