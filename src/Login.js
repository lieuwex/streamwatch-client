import { useState } from 'react';
import Snackbar from '@material-ui/core/Snackbar';

import './Login.css';

function User(props) {
	const onClick = () => {
		props.onSelect(props.username);
	};

	return (
		<div className="user" onClick={onClick}>
			{props.name} ({props.username})
		</div>
	)
}

function Login() {
	const [isOpen, setIsOpen] = useState(false);

	const onSelect = username => {
		localStorage.setItem('username', username);
		setIsOpen(true);
	};

	return <>
		<div className="login">
			<User onSelect={onSelect} name="Lieuwe" username="lieuwe" />
			<User onSelect={onSelect} name="Bart" username="bart" />
		</div>

		<Snackbar
			open={isOpen}
			autoHideDuration={6000}
			message="Username set"
		/>
	</>;
}

export default Login;
