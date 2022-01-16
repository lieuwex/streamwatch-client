import {  Dialog, DialogTitle, DialogContent, Autocomplete, TextField } from '@mui/material';
import { useRef } from 'react';
import swrImmutable from 'swr/immutable';

import Loading from '../Loading.js';
import { fetcher } from '../util.js';

function sortFunc(a, b) {
	const a_is_top = [1, 2].includes(a.id);
	const b_is_top = [1, 2].includes(b.id);

	if (a_is_top === b_is_top) {
		return b.name - a.name;
	} else if (a_is_top) {
		return -1;
	} else {
		return 1;
	}
}

export default function PersonsDialog(props) {
	const selected = useRef(props.video.persons);
	const changed = useRef(false);

	const { data, error } = swrImmutable('http://local.lieuwe.xyz:6070/persons', fetcher);
	if (data != null) {
		data.sort(sortFunc);
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
					autoFocus={true}
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
