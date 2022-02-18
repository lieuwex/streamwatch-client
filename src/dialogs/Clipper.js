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

import { clamp } from './../util.js';

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
	videoWrapper: {
		position: 'relative',
		width: '100%',
		marginTop: '20px',
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
						value={[ props.start, props.progress, props.end ]}
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

	const initialStart = props.currentTime - 10;
	const initialEnd = props.currentTime + 10;
	const initialProgress = initialStart;

	const classes = useStyles();

	const titleRef = useRef(null);

	const [playing, setPlaying] = useState(true);
	const [buffering, setBuffering] = useState(true);

	const [start, setStart] = useState(initialStart);
	const [progress, setProgress] = useState(initialProgress);
	const [end, setEnd] = useState(initialEnd);

	const handleClose = () => props.handleClose(null, null);
	const onCreateClip = () => {
		createClip(
			video.id,
			start,
			end,
			titleRef.current.value || null
		)
		.then(clip => props.handleClose(clip, null))
		.catch(e => props.handleClose(null, e));
	};

	const playerRef = useRef(null);
	const handleSeek = ([ startFract, nowFract, endFract ]) => {
		nowFract = clamp(nowFract, startFract, endFract);

		setProgress(nowFract * video.duration);
		if (playerRef.current != null) {
			playerRef.current.seekTo(nowFract, 'fraction');
		}

		setStart(startFract * video.duration);
		setEnd(endFract * video.duration);
	};
	const onProgress = ({ playedSeconds }) => {
		if (playedSeconds > end) {
			if (playerRef.current != null) {
				playerRef.current.seekTo(start, 'seconds');
			}
			setProgress(start);
		} else {
			setProgress(playedSeconds);
		}
	};

	const content = <>
		<TextField
			id="title"
			label="Titel"
			inputRef={titleRef}
			defaultValue={titleRef.current}
			sx={{ width: '100%' }}
		/>

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
				start={start / video.duration}
				progress={progress / video.duration}
				end={end / video.duration}
				playing={playing}
				onPlayChange={x => setPlaying(x)}
			/>
		</div>
	</>;

	const actions = <>
		<Button onClick={handleClose}>Annuleren</Button>
		<Button onClick={onCreateClip}>Clip aanmaken</Button>
	</>;

	return [content, actions];
}

function ClipperWrapper(props) {
	const [[state, data], setState] = useState([ 'create' ]);

	const handleClose = () => props.handleClose(null, null);

	let content, actions;
	if (state === 'create') {
		[content, actions] = Clipper({
			...props,
			handleClose: (clip, err) => {
				if (err != null) {
					setState([ 'error', err ]);
				} else if (clip != null) {
					setState([ 'result', clip ]);
				} else {
					handleClose();
				}
			}
		});
	} else if (state === 'error') {
		content = <div>Error while creating clip: {data}</div>;
		actions = <Button onClick={handleClose}>Sluiten</Button>;
	} else if (state === 'result') {
		content = <div>{`http://local.lieuwe.xyz:6070/clip/${data.id}`}</div>;
		actions = <Button onClick={handleClose}>Sluiten</Button>;
	}

	return (
		<Dialog
				open={true}
				onClose={handleClose}
				fullWidth={true}
				maxWidth="md"
		>
			<DialogTitle>Clip aanmaken</DialogTitle>

			<DialogContent>
				{content}
			</DialogContent>

			<DialogActions>
				{actions}
			</DialogActions>
		</Dialog>
	);
}

export default ClipperWrapper;
