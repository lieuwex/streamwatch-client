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

	const [score, setScore] = useState((data || {})[props.video.id] || null);
	const titleRef = useRef({ value: props.video.title_type === 'custom' ? props.video.title : null });
	const changed = useRef(false);

	const classes = useStyles();

	const handleClose = () => props.handleClose(changed.current ? titleRef.current.value : null, null);

	const vote = newScore => {
		if (newScore === score) {
			newScore = 0;
		}

		fetch(`http://local.lieuwe.xyz:6070/stream/${props.video.id}/rate`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({
				username,
				score: newScore,
			}),
		});

		setScore(newScore);
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
						inputRef={titleRef}
						defaultValue={titleRef.current.value}
						onChange={() => changed.current = true}
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
