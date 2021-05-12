import Backdrop from '@material-ui/core/Backdrop';
import CircularProgress from '@material-ui/core/CircularProgress';

function Loading({ heavyLoad = false, position = 'fixed' }) {
	return (
		<Backdrop open={true} invisible={true} sx={{ position }}>
			<CircularProgress disableShrink={heavyLoad} />
		</Backdrop>
	);
}

export default Loading;
