import { useEffect, useRef } from 'react';

import { makeStyles } from '@mui/styles';

const useStyles = makeStyles({
	urlOutput: {
		border: 'none !important',
		width: '100%',
		fontSize: '1em',
		fontFamily: '"Inter Var"',
		outline: 'none !important',
	},
});

export default function SelectedText(props) {
	const inputRef = useRef(null);
	useEffect(() => inputRef.current.select());

	const classes = useStyles();

	return <input
		className={classes.urlOutput}
		ref={inputRef}
		readOnly
		value={props.value}
	/>;
}
