import { Link } from 'react-router-dom';

import swr from 'swr';

import { useEffect, useState } from "react";

import { makeStyles } from '@mui/styles';

import { fetcher } from './util.js';

const useStyles = makeStyles({
	list: {
		position: 'fixed',
		top: 0,
		left: 0,
		right: 0,
		bottom: 0,

		display: 'flex',
		justifyContent: 'center',
		alignItems: 'center',
		flexDirection: 'column',
	},

	status: {
		marginBottom: '10px',
	},

	button: {
		width: '300px',
		padding: '30px',
		backgroundColor: 'rgb(27 27 27)',
		borderRadius: '10px',
		marginBottom: '10px',
		textAlign: 'center',
		cursor: 'pointer',

		transition: 'all .1s ease-out',
		boxShadow: '0px 10px 19px -7px rgb(0 0 0 / 50%)',

		'&:hover': {
			boxShadow: '0px 14px 19px -7px rgb(0 0 0 / 50%)',
		}
	},
});

function generateId(length = 10) {
	// HACK
	return new Array(length).fill(0).map(() => String.fromCharCode(65 + parseInt(Math.random()*25))).join(''); // HACK
}

function Button(props) {
	const classes = useStyles();

	return (
		<div className={classes.button} onClick={props.onClick}>
			{props.children}
		</div>
	)
}

export default function SelectWatchparty() {
	const classes = useStyles();

	useEffect(() => {
		document.title = 'Streamwatch - watch party';
	}, []);

	const [connectedTo, setConnectedTo] = useState(null);

	const { data, error } = swr('https://streams.lieuwe.xyz/api/parties', fetcher);

	const join = name => {
		if (window.partyWs != null) {
			window.partyWs.close();
		}

		window.partySelfId = generateId(10);

		const ws = new WebSocket(`ws://local.lieuwe.xyz:6070/api/party/ws?party_id=${name}`);

		ws.onopen = () => setConnectedTo(name);
		ws.onmessage = msg => {
			console.log(msg);
		};

		window.partyWs = ws;
	};

	const partyButtons = Object.entries(data || {}).map(x => {
		const [name, userCount] = x;

		return <Button key={name} onClick={() => join(name)}>
			{name} ({userCount})
		</Button>;
	});

	const createNew = () => {
		const id = generateId(10);
		join(id);
	};

	if (error) {
		return <div>error while loading</div>;
	}

	return <>
		<div className={classes.list}>
			{ connectedTo == null ? <></> : <div className={classes.status}>Connected to room {connectedTo}!</div> }
			{partyButtons}
			<Button onClick={createNew}>
				Create new
			</Button>
			<Link to={`/`}>
				Ga naar streamlijst
			</Link>
		</div>
	</>;
}
