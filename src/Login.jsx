import { useEffect, useCallback, useRef, useState } from 'react';
import { makeStyles } from '@mui/styles';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';

import Loading from './Loading';
import { setCookies } from './util';
import { users } from './users.js';

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

	form: {
		display: 'flex',
		flexDirection: 'column',
		gap: '20px',

		width: '500px',
		maxWidth: '100%',

		backgroundColor: 'white',
		padding: '30px',
		borderRadius: '10px',
	},

	row: {
		display: 'flex',
		justifyContent: 'space-between',
	},
});

async function login(username, password) {
	const res = await fetch(`https://streams.lieuwe.xyz/api/user/${username}?password=${password}`);

	if (res.status === 200) {
		localStorage.setItem('username', username);
		localStorage.setItem('password', password);

		setCookies();
	} else {
		throw new Error('error logging in');
	}
}

async function signup(username, password) {
	const res = await fetch(`https://streams.lieuwe.xyz/api/user/${username}?password=${password}`, {
		method: 'POST',
	});

	if (res.status === 201) {
		return;
	} else if (res.status === 409) {
		// TODO: this doesn't make sense in relationship to the backend
		throw new Error('Account met gebruikersnaam bestaat al');
	} else {
		// idk
		//throw new Error('Onbekende fout');
		throw new Error('Kon geen account maken (misschien is de gebruikersnaam al bezet?)');
	}
}

function redirect() {
	const dest = sessionStorage.getItem('redirect');
	sessionStorage.removeItem('redirect');
	window.location.href = dest || '/';
}

function Login() {
	const classes = useStyles();

	const usernameRef = useRef();
	const passwordRef = useRef();

	const [loading, setLoading] = useState(false);

	useEffect(() => {
		document.title = 'Streamwatch - login';
	}, []);

	const onLogin = useCallback(async () => {
		const username = usernameRef.current.value.toLowerCase();
		const password = passwordRef.current.value.toLowerCase();

		setLoading(true);
		try {
			await login(username, password);
			redirect();
		} catch (error) {
			alert("Onjuiste gebruikersnaam en/of watchtwoord");
			setLoading(false);
		}
	}, [usernameRef, passwordRef]);

	const onSignup = useCallback(async () => {
		const username = usernameRef.current.value.toLowerCase();
		const password = passwordRef.current.value.toLowerCase();

		setLoading(true);
		try {
			await signup(username, password);
			await login(username, password);
			redirect();
		} catch (error) {
			//alert(error.message);
			alert('Kon geen account maken (misschien is de gebruikersnaam al bezet?)');
			setLoading(false);
		}
	}, [usernameRef, passwordRef]);

	const onKeyUp = useCallback(e => {
		if (e.keyCode === 13) onLogin();
	}, [usernameRef, passwordRef]);

	if (loading) {
		return <Loading />;
	}

	return <>
		<div className={classes.login}>
			<h2>Inloggen</h2>
			<form className={classes.form} onSubmit={onLogin}>
				<div style={{ color: 'black' }}>
					<b>Waarschuwing</b>: wachtwoord wordt onveilig opgeslagen, want ik ben lui.
				</div>

				<TextField type="text" id="username" label="Gebruikersnaam" autoFocus inputRef={usernameRef} onKeyUp={onKeyUp} />
				<TextField type="text" id="password" label="Wachtwoord" inputRef={passwordRef} onKeyUp={onKeyUp} />

				<div className={classes.row}>
					<Button onClick={onSignup}>Account maken</Button>
					<Button variant="contained" onClick={onLogin}>Inloggen</Button>
				</div>
			</form>
		</div>
	</>;
}

export default Login;
