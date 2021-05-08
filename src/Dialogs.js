import { useRef, useState } from 'react';
import { Button, IconButton, Dialog, DialogTitle, DialogContent, Autocomplete, TextField, List, ListItem, ListItemText } from '@material-ui/core';
import { Clear } from '@material-ui/icons';
import { makeStyles } from '@material-ui/core/styles';
import formatDuration from 'format-duration';
import swr from 'swr';

import Loading from './Loading.js';
import { fetcher, parseDuration, formatGame } from './util.js';

const PersonsDialog = props => {
	const { data, error } = swr('http://local.lieuwe.xyz:6070/persons', fetcher);
	const selected = useRef(props.video.persons);
	const changed = useRef(false);

	if (data != null) {
		data.sort((a, b) => {
			const a_is_top = [1, 2].includes(a.id);
			const b_is_top = [1, 2].includes(b.id);

			if (a_is_top === b_is_top) {
				return b.name - a.name;
			} else if (a_is_top) {
				return -1;
			} else {
				return 1;
			}
		});
	}

	let content = <Loading />;
	if (error) {
		content = "Error while loading persons";
	} else if (data) {
		content = <Autocomplete
			onChange={(_, items) => {
				selected.current = items;
				changed.current = true;
			}}
			multiple
			options={data}
			getOptionLabel={({ name }) => name}
			defaultValue={props.video.persons}
			getOptionSelected={(a, b) => a.id === b.id}
			filterSelectedOptions
			renderInput={(params) => (
				<TextField
					{...params}
					label="Personen"
					placeholder="Personen"
				/>
			)}
		/>;
	}

	const handleClose = () => {
		selected.current.sort((a, b) => a.id < b.id);
		props.handleClose(changed.current ? selected.current : null, null);
	};

	return (
		<Dialog
			open={true}
			onClose={handleClose}
			fullWidth={true}
			maxWidth="sm"
		>
			<DialogTitle>Personen in deze stream</DialogTitle>
			<DialogContent>
				{content}
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
			<IconButton onClick={() => props.onDelete(game.id)}>
				<Clear />
			</IconButton>
		</ListItem>
	);
};

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
});

const AddGame = props => {
	const time = formatDuration(1000 * props.currentTime);

	const classes = useStyles();

	const { data, error } = swr('http://local.lieuwe.xyz:6070/games', fetcher);
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
				renderInput={params => <TextField {...params} label="Game" />}
				getOptionSelected={(a, b) => a.id === b.id}
				onChange={(_, game) => selectedInfo.current.game = game}
			/>
			<TextField
				defaultValue={time}
				label="Tijd"
				onChange={e => selectedInfo.current.time = e.target.value}
			/>
			<Button onClick={onAdd}>Toevoegen</Button>
		</div>
	);
}

const GamesDialog = props => {
	const [items, setItems] = useState(props.video.games);
	const changed = useRef(false);

	const onAdded = info => {
		const newItems = [...items, info];
		newItems.sort((a, b) => a.start_time < b.start_time);
		setItems(newItems);
		changed.current = true;
	};
	const onDelete = id => {
		setItems(items.filter(g => g.id !== id));
		changed.current = true;
	};
	const handleClose = () => props.handleClose(changed.current ? items : null, null);
	const onSeek = progress => props.handleClose(null, progress);

	const nodes = items.map((g, i) => <GamesDialogItem key={i} game={g} onDelete={onDelete} onSeek={onSeek} />);

	return (
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

				<AddGame currentTime={props.currentTime} onAdded={onAdded} />
			</DialogContent>
		</Dialog>
	);
};

export default function PlayerDialog(props) {
	if (props.type === 'participants') {
		return <PersonsDialog handleClose={props.handleClose} video={props.video} />;
	} else if (props.type === 'games') {
		return <GamesDialog handleClose={props.handleClose} video={props.video} currentTime={props.currentTime} />;
	}

	return <></>;
};
