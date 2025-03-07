import { useRef, useState } from 'react';
import { makeStyles } from '@mui/styles';
import { ThumbUp, ThumbDown } from '@mui/icons-material';
import { IconButton, Dialog, DialogTitle, DialogContent, TextField } from '@mui/material';
import swr from 'swr';

import { fetcher, getCurrentUrl } from '../util.js';

import SelectedText from '../SelectedText';

const useStyles = makeStyles({
	vote: {
		textAlign: 'center',
		fontSize: '1.2em',
	},
});

export default function MetadataDialog(props) {
	const username = localStorage.getItem('username');
	const password = localStorage.getItem('password') || '';
	let { data } = swr(username != null ? `https://streams.lieuwe.xyz/api/user/${username}/ratings?password=${password}` : null, fetcher);

	const [newScore, setNewScore] = useState(null);
	let score;
	if (newScore != null) {
		score = newScore;
	} else {
		score = (data || {})[props.video.id] || 0;
	}

	const titleRef = useRef({ value: props.video.title_type === 'custom' ? props.video.title : null });
	const titleChanged = useRef(false);

	const classes = useStyles();

	const handleClose = () => props.handleClose(titleChanged.current ? titleRef.current.value : null, null);

	const vote = val => {
		if (val === score) {
			// undo vote
			val = 0;
		}

		fetch(`https://streams.lieuwe.xyz/api/stream/${props.video.id}/rate?password=${password}`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({
				username,
				score: val,
			}),
		});

		setNewScore(val);
	};

	const url = getCurrentUrl();
	url.searchParams.set('s', Math.floor(props.currentTime));

	return (
		<>
			<Dialog
				open={true}
				onClose={handleClose}
				fullWidth={true}
				maxWidth="sm"
			>
				<DialogTitle>Metadata</DialogTitle>
				<DialogContent>
					<SelectedText value={url.toString()} />

					<TextField
						id="title"
						label="Custom titel"
						autoFocus={true}
						inputRef={titleRef}
						defaultValue={titleRef.current.value}
						onChange={() => titleChanged.current = true}
						sx={{ width: '100%', marginTop: '25px' }}
					/>

					{
						username == null
						? <></>
						: <div className={classes.vote}>
							<IconButton onClick={() => vote(1)}>
								<ThumbUp color={score === 1 ? 'primary' : ''} />
							</IconButton>
							<IconButton onClick={() => vote(-1)}>
								<ThumbDown color={score === -1 ? 'primary' : ''} />
							</IconButton>
						</div>
					}

				</DialogContent>
			</Dialog>
		</>
	);
};
