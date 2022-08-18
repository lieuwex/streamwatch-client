import { useRef, useState } from 'react';

import { Button, Dialog, DialogTitle, DialogContent, DialogActions, TextField, Slider } from '@mui/material';
import { makeStyles } from '@mui/styles';
import { Pause, PlayArrow } from '@mui/icons-material';

import formatDuration from 'format-duration';
import useMousetrap from 'react-hook-mousetrap';

import './Clipper.css';

import { Video } from './../Player.js';
import HypeGraph from './../HypeGraph.js';
import { Button as ControlsButton } from './../Controls.js';
import SelectedText from './../SelectedText.js';

import { clamp } from './../util.js';

async function createClip(clipId, videoId, start, end, title) {
	const username = localStorage.getItem('username');
	if (username == null) {
		throw new Error('user not logged in');
	}
	const password = localStorage.getItem('password') || '';

	let url = 'http://local.lieuwe.xyz:6070/api';
	let method;
	if (clipId == null) {
		url += '/clips';
		method = 'POST';
	} else {
		url += `/clips/${clipId}`;
		method = 'PUT';
	}
	url += `?password=${password}`;

	const res = await fetch(url, {
		method,
		headers: {
			'Content-Type': 'application/json',
		},
		body: JSON.stringify({
			author_username: username,
			stream_id: videoId,
			start_time: Math.round(start),
			duration: Math.round(end - start),
			title,
		}),
	});
	return await res.json();
}

const useStyles = makeStyles({
	durationsBar: {
		display: 'flex',
		alignItems: 'center',
		justifyContent: 'space-evenly',

		paddingLeft: '50px',
		paddingRight: '50px',

		marginTop: '20px',
		marginBottom: '10px',
	},

	videoWrapper: {
		position: 'relative',
		width: '100%',
		marginTop: '20px',

		'& .duration': {
			color: 'white',
		},
	},
});

function ClipperControls(props) {
	return (
		<div className={`video-controls ${props.visible ? 'visible' : ''}`}>
			<div className="controls-row information">
				<div className="duration fixed-width-num">
					{formatDuration(1000 * props.progress * props.video.duration)} / {formatDuration(1000 * props.video.duration)}
				</div>
			</div>
			<div className="controls-row">
				<ControlsButton onClick={() => props.onPlayChange(!props.playing)}>
					{ props.playing ? <Pause /> : <PlayArrow /> }
				</ControlsButton>

				<div className="clipper-slider slider-container">
					<HypeGraph video={props.video} region={[0, props.video.duration]} />
					<Slider
						value={props.progress}
						disableSwap
						max={1}
						step={0.001}
						onChange={(_, newValue) => props.onSeek(newValue)}
					/>
				</div>
			</div>
		</div>
	);
};

function Clipper(props) {
	const video = props.video;
	const originalId = props.clip?.id;

	const center = props.currentTime;
	const initialProgress = center - 10;

	const classes = useStyles();

	const titleRef = useRef(props.clip?.title || null);
	const startRef = useRef({ value: '10' });
	const endRef = useRef({ value: '10' });

	const getStart = () => center - (+startRef.current.value || 0);
	const getEnd = () => center + (+endRef.current.value || 0);

	const [playing, setPlaying] = useState(true);

	const [progress, setProgress] = useState(initialProgress);

	const handleClose = () => props.handleClose(null, null);
	const onCreateClip = () => {
		createClip(
			originalId,
			video.id,
			getStart(),
			getEnd(),
			titleRef.current.value || null
		)
		.then(clip => props.handleClose(clip, null))
		.catch(e => props.handleClose(null, e));
	};

	const playerRef = useRef(null);
	const handleSeek = (nowFract) => {
		setProgress(nowFract * video.duration);
		if (playerRef.current != null) {
			playerRef.current.seekTo(nowFract, 'fraction');
		}
	};
	const onProgress = ({ playedSeconds }) => {
		const start = getStart();
		const end = getEnd();

		if (start <= playedSeconds && playedSeconds <= end) {
			setProgress(playedSeconds);
			return;
		}

		if (playerRef.current != null) {
			playerRef.current.seekTo(start, 'seconds');
		}
		setProgress(start);
	};

	const showStart = () => {
		const start = getStart();
		if (playerRef.current != null) {
			playerRef.current.seekTo(start, 'seconds');
		}
		setProgress(start);
	};
	const showEnd = () => {
		const end = getEnd() - 3;
		if (playerRef.current != null) {
			playerRef.current.seekTo(end, 'seconds');
		}
		setProgress(end);
	};

	const content = <>
		<TextField
			id="title"
			label="Titel"
			inputRef={titleRef}
			defaultValue={titleRef.current}
			sx={{ width: '100%' }}
		/>

		<div className={classes.durationsBar}>
			<TextField
				id="start"
				label="Ervoor"
				inputRef={startRef}
				onChange={showStart}
				defaultValue={startRef.current.value}
				sx={{ width: '100px' }}
			/>

			{formatDuration(1000 * center)}

			<TextField
				id="end"
				label="Erna"
				inputRef={endRef}
				onChange={showEnd}
				defaultValue={endRef.current.value}
				sx={{ width: '100px' }}
			/>
		</div>

		<div className={classes.videoWrapper}>
			<Video
				video={video}
				//volume={muted ? 0 : volume}
				playing={playing}
				initialProgress={initialProgress}
				//controls={useNativeControls}
				ref={playerRef}
				onProgress={onProgress}
				onPause={() => setPlaying(false)}
				onPlay={() => setPlaying(true)}
				//onSingleClick={wrapMarkActive(() => setPlaying(!playing))}
				//onDoubleClick={wrapMarkActive(() => changeFullscreen(!fullscreen[0]))}
			/>

			<ClipperControls
				video={video}
				visible={true}
				onSeek={handleSeek}
				progress={progress / video.duration}
				playing={playing}
				onPlayChange={x => setPlaying(x)}
				region={[0, video.duration]}
			/>
		</div>
	</>;

	const actions = <>
		<Button onClick={handleClose}>Annuleren</Button>
		<Button onClick={onCreateClip}>Clip aanmaken</Button>
	</>;

	return <>
		<DialogContent>
			{content}
		</DialogContent>

		<DialogActions>
			{actions}
		</DialogActions>
	</>;
}

function ClipperWrapper(props) {
	const [[state, data], setState] = useState([ 'create' ]);

	const handleClose = () => props.handleClose(null, null);

	let content;
	if (state === 'create') {
		content = <Clipper
			{...props}
			handleClose={(clip, err) => {
				if (err != null) {
					setState([ 'error', err ]);
				} else if (clip != null) {
					setState([ 'result', clip ]);
				} else {
					handleClose();
				}
			}}
		/>;
	} else if (state === 'error') {
		content = <>
			<DialogContent>
				<div>Error while creating clip: {data.toString()}</div>
			</DialogContent>

			<DialogActions>
				<Button onClick={handleClose}>Sluiten</Button>
			</DialogActions>
		</>;
	} else if (state === 'result') {
		content = <>
			<DialogContent>
				<SelectedText value={`http://local.lieuwe.xyz:6070/clip/${data.id}`} />
			</DialogContent>

			<DialogActions>
				<Button onClick={handleClose}>Sluiten</Button>
			</DialogActions>
		</>;
	}

	return (
		<Dialog
				open={true}
				onClose={handleClose}
				fullWidth={true}
				maxWidth="sm"
		>
			<DialogTitle>Clip aanmaken</DialogTitle>

			{content}
		</Dialog>
	);
}

export default ClipperWrapper;
