import { useEffect } from 'react';
import { makeStyles } from '@mui/styles';

const useStyles = makeStyles({
	login: {
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

	user: {
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

function User(props) {
	const classes = useStyles();

	const onClick = () => props.onSelect(props.username);

	return (
		<div className={classes.user} onClick={onClick}>
			{/* {props.name} ({props.username}) */}
			{props.name}
		</div>
	)
}

function Login() {
	const classes = useStyles();

	useEffect(() => {
		document.title = 'Streamwatch - login';
	}, []);

	const onSelect = username => {
		let password = null;
		if ([ 'lieuwe', 'bart', 'lisanne' ].includes(username)) {
			password = window.prompt('Voer je wachtwoord in (let op, het is gewoon zichtbaar gast)');
		}

		localStorage.setItem('username', username);
		localStorage.setItem('password', password);

		window.location.href = '/';
	};

	return <>
		<div className={classes.login}>
			<User onSelect={onSelect} name="Lieuwe" username="lieuwe" />
			<User onSelect={onSelect} name="Bart" username="bart" />
			<User onSelect={onSelect} name="Lisanne" username="lisanne" />
			<User onSelect={onSelect} name="Marente" username="marente" />
			<User onSelect={onSelect} name="Daan" username="daan" />
			<User onSelect={onSelect} name="Mees" username="mees" />
			<User onSelect={onSelect} name="Victor" username="victor" />
		</div>
	</>;
}

export default Login;
