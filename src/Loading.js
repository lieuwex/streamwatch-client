import Backdrop from '@material-ui/core/Backdrop';
import CircularProgress from '@material-ui/core/CircularProgress';

function Loading() {
	return (
		<Backdrop open={true} invisible={true}>
			<CircularProgress />
		</Backdrop>
	);
}

export default Loading;
