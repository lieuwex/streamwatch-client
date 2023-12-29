import { useRef, useState } from 'react';
import { makeStyles } from '@mui/styles';
import { Clear } from '@mui/icons-material';
import { Button, IconButton, Dialog, DialogTitle, DialogContent, Autocomplete, TextField, List, ListItem, ListItemText } from '@mui/material';
import swrImmutable from 'swr/immutable';
import { mutate } from 'swr';
import formatDuration from 'format-duration';

import Loading from '../Loading.js';
import { fetcher, parseDuration, formatGame } from '../util.js';

const useStyles = makeStyles({
	addGame: {
		display: 'flex',

		'& > :first-child': {
			width: '100%',
		},

		'& > :not(:first-child)': {
			marginLeft: '15px',
		},

		'& > :last-child': {
			marginLeft: '25px',
		},
	},
	createGame: {
		display: 'flex',

		'& > *:not(:last-child)': {
			marginRight: '10px',
		},
	}
});

async function addGame(dict) {
	await fetch(`https://streams.lieuwe.xyz/api/games`, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
		},
		body: JSON.stringify(dict),
	});
	mutate('https://streams.lieuwe.xyz/api/games');
}

const CreateGameDialog = props => {
	const nameRef = useRef(null);
	const platformRef = useRef(null);

	const classes = useStyles();

	const handleClose = () => props.handleClose();
	const onAdd = () => {
		const name = nameRef.current.value;
		const platform = platformRef.current.value;

		const dict = { name };
		if (platform != null && platform.length > 0) {
			dict['platform'] = platform;
		}
		addGame(dict).catch(e => console.error(e));

		handleClose();
	};

	return (
		<Dialog
			open={props.open}
			onClose={handleClose}
			fullWidth={true}
			maxWidth="sm"
		>
			<DialogTitle>Nieuwe game aanmaken</DialogTitle>
			<DialogContent>
				<div className={classes.createGame}>
					<TextField
						required
						id="name"
						label="Naam"
						autoFocus={true}
						inputRef={nameRef}
					/>

					<TextField
						id="platform"
						label="Platform"
						inputRef={platformRef}
					/>

					<Button onClick={onAdd}>Toevoegen</Button>
				</div>
			</DialogContent>
		</Dialog>
	);
};

const GamesDialogItem = props => {
	const game = props.game;

	const onClick = () => props.onSeek(game.start_time);

	return (
		<ListItem>
			<ListItemText primary={game.name} secondary={game.platform} />
			<Button onClick={onClick}>{formatDuration(1000 * game.start_time)}</Button>
			<IconButton onClick={() => props.onDelete(game)}>
				<Clear />
			</IconButton>
		</ListItem>
	);
};

const AddGameRow = props => {
	const time = formatDuration(1000 * props.currentTime);

	const classes = useStyles();

	const { data, error } = swrImmutable('https://streams.lieuwe.xyz/api/games', fetcher);
	const selectedInfo = useRef({ game: null, time });

	const onAdd = () => {
		const curr = selectedInfo.current;
		props.onAdded({ ...curr.game, start_time: parseDuration(curr.time) });
	};

	if (error) {
		return "Error while loading persons";
	} else if (!data) {
		return <Loading />;
	}

	return (
		<div className={classes.addGame}>
			<Autocomplete
				options={data}
				getOptionLabel={formatGame}
				renderOption={(props, game) => (
					<li {...props}>
						<ListItemText primary={game.name} secondary={game.platform} />
					</li>
				)}
				renderInput={params => <TextField {...params} label="Game" autoFocus={true} />}
				getOptionSelected={(a, b) => a.id === b.id}
				onChange={(_, game) => selectedInfo.current.game = game}
			/>
			<TextField
				required
				defaultValue={time}
				label="Tijd"
				onChange={e => selectedInfo.current.time = e.target.value}
			/>
			<Button onClick={onAdd}>Toevoegen</Button>
		</div>
	);
}

export default function GamesDialog(props) {
	const [items, setItems] = useState(props.video.games);
	const changed = useRef(false);

	const [createDialogOpen, setCreateDialogOpen] = useState(false);

	const onAdded = info => {
		const newItems = [...items, info];
		newItems.sort((a, b) => a.start_time < b.start_time);
		setItems(newItems);
		changed.current = true;
	};
	const onDelete = ({ id, start_time }) => {
		setItems(items.filter(g => !(g.id === id && g.start_time === start_time)));
		changed.current = true;
	};
	const handleClose = () => props.handleClose(changed.current ? items : null, null);
	const onSeek = progress => props.handleClose(changed.current ? items : null, progress);

	const nodes = items.map((g, i) => <GamesDialogItem key={i} game={g} onDelete={onDelete} onSeek={onSeek} />);

	return (
		<>
			<Dialog
				open={true}
				onClose={handleClose}
				fullWidth={true}
				maxWidth="sm"
			>
				<DialogTitle>Games in deze stream</DialogTitle>
				<DialogContent>
					<List>
						{nodes}
					</List>

					<AddGameRow currentTime={props.currentTime} onAdded={onAdded} />

					<div style={{ textAlign: 'center', marginTop: '15px' }}>
						<Button variant="contained" onClick={() => setCreateDialogOpen(true)}>Nieuwe game aanmaken</Button>
					</div>
				</DialogContent>
			</Dialog>

			<CreateGameDialog open={createDialogOpen} handleClose={() => setCreateDialogOpen(false)} />
		</>
	);
};
