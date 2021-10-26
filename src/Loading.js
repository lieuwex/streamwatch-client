import Backdrop from '@mui/material/Backdrop';
import CircularProgress from '@mui/material/CircularProgress';

function Loading({ heavyLoad = false, position = 'fixed' }) {
	return (
		<Backdrop open={true} invisible={true} sx={{ position }}>
			<CircularProgress disableShrink={heavyLoad} />
		</Backdrop>
	);
}

export default Loading;
