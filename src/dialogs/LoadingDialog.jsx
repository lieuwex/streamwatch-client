import { Dialog, DialogTitle, DialogContent } from '@mui/material';

import Loading from '../Loading';

export default function LoadingDialog() {
	return (
		<Dialog
			open={true}
			fullWidth={true}
			maxWidth="sm"
		>
			<DialogTitle>Laden...</DialogTitle>
			<DialogContent>
				<Loading />
			</DialogContent>
		</Dialog>
	);
};
