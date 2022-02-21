import { useEffect, useRef, useState } from 'react';

import { Button, Dialog, DialogTitle, DialogContent, DialogActions, TextField, Slider } from '@mui/material';
import { makeStyles } from '@mui/styles';
import { Pause, PlayArrow } from '@mui/icons-material';

import formatDuration from 'format-duration';
import useMousetrap from 'react-hook-mousetrap';

import './Clipper.css';

import { Video } from './../Player.js';
import HypeGraph from './../HypeGraph.js';
import { Button as ControlsButton } from './../Controls.js';

import { clamp, parseDuration } from './../util.js';

async function createClip(videoId, start, end, title) {
	const username = localStorage.getItem('username');
	if (username == null) {
		throw new Error('user not logged in');
	}

	const res = await fetch(`http://local.lieuwe.xyz:6070/clips`, {
		method: 'POST',
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

	urlOutput: {
		border: 'none !important',
		width: '100%',
		fontSize: '1em',
		fontFamily: '"Inter Var"',
		outline: 'none !important',
	},
});

function ClipperControls(props) {
	const wrap = fn => {
		return e => {
			e.stopImmediatePropagation();
			e.preventDefault();

			fn();
		};
	};

	const seekDelta = delta => {
		const deltaFract = delta / props.video.duration;
		const newValue = props.progress + deltaFract;
		props.onSeek(clamp(newValue, 0, 1));
	};
	useMousetrap('left', wrap(() => seekDelta(-10)));
	useMousetrap('right', wrap(() => seekDelta(10)));

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

	const center = props.currentTime;
	const initialProgress = center - 10;

	const classes = useStyles();

	const titleRef = useRef(null);
	const startRef = useRef({ value: '10' });
	const endRef = useRef({ value: '10' });

	const getStart = () => center - +startRef.current.value;
	const getEnd = () => center + +endRef.current.value;

	const [playing, setPlaying] = useState(true);
	const [buffering, setBuffering] = useState(true);

	const [progress, setProgress] = useState(initialProgress);

	const handleClose = () => props.handleClose(null, null);
	const onCreateClip = () => {
		createClip(
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

		console.log(start, playedSeconds, end);

		if (start <= playedSeconds && playedSeconds <= end) {
			setProgress(playedSeconds);
			return;
		}

		if (playerRef.current != null) {
			playerRef.current.seekTo(start, 'seconds');
		}
		setProgress(start);
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
				defaultValue={startRef.current.value}
				sx={{ width: '100px' }}
			/>

			{formatDuration(1000 * center)}

			<TextField
				id="end"
				label="Erna"
				inputRef={endRef}
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
				onBuffer={() => setBuffering(true)}
				onBufferEnd={() => setBuffering(false)}
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
	const classes = useStyles();

	const [[state, data], setState] = useState([ 'create' ]);

	const handleClose = () => props.handleClose(null, null);

	const inputRef = useRef(null);
	useEffect(() => {
		if (state !== 'result' || inputRef.current == null) {
			return;
		}

		inputRef.current.select();
	});

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
				<input
					className={classes.urlOutput}
					ref={inputRef}
					readOnly
					value={`http://local.lieuwe.xyz:6070/clip/${data.id}`}
				/>
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
