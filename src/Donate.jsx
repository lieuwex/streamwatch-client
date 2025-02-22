import {Dialog, DialogTitle, DialogContent, DialogActions, Button} from '@mui/material';
import {useEffect, useState} from 'react';

const NAG_INTERVAL = 5 * 24 * 60 * 60 * 1e3; // 5 days

export default function Donate() {
	const [open, setOpen] = useState(() => {
		const lastNag = +(localStorage.getItem('lastNag') ?? 0);
		const shouldNag = (Date.now() - lastNag) > NAG_INTERVAL;
		return shouldNag;
	});

	useEffect(() => {
		if (open) {
			localStorage.setItem('lastNag', Date.now());
		}
	}, [open]);

	return <Dialog open={open}>
		<DialogTitle sx={{fontSize: '2.5em', fontWeight: 'bold'}}>Alsjeblieft, doneer</DialogTitle>
		<DialogContent sx={{fontSize: '1.2em'}}>
			Nationaal erfgoed bewaren kost geld, help een collega zakenman! <br />
			<a href="https://paypal.me/lieuwe/2.50EUR">Zo'n spreekwoordelijke PayPal linkie</a>.
		</DialogContent>

		<DialogActions>
			<Button onClick={() => setOpen(false)} variant="outlined" color="error">doe ik niet (mijn bedrijf is failliet, mijn hond heeft mijn PayPal account opgegeten, ik sta onder curatele, etc...)</Button>
		</DialogActions>
	</Dialog>
}
