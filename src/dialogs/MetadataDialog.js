import { useRef, useState } from 'react';
import { makeStyles } from '@mui/styles';
import { ThumbUp, ThumbDown } from '@mui/icons-material';
import { IconButton, Dialog, DialogTitle, DialogContent, TextField } from '@mui/material';
import swr from 'swr';

import { fetcher } from '../util.js';

const useStyles = makeStyles({
	vote: {
		textAlign: 'center',
		fontSize: '1.2em',
	},
});

export default function MetadataDialog(props) {
	const username = localStorage.getItem('username');
	let { data } = swr(username != null ? `http://local.lieuwe.xyz:6070/user/${username}/ratings` : null, fetcher);

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

		fetch(`http://local.lieuwe.xyz:6070/stream/${props.video.id}/rate`, {
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
					<TextField
						id="title"
						label="Custom titel"
						autoFocus={true}
						inputRef={titleRef}
						defaultValue={titleRef.current.value}
						onChange={() => titleChanged.current = true}
						sx={{ width: '100%' }}
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
