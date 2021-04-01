import { useParams } from 'react-router-dom';
import ReactPlayer from 'react-player';
import React, { useState, useRef, useEffect } from 'react';
import { Slider, IconButton, Popover, Autocomplete, TextField } from '@material-ui/core';
import { Pause, PlayArrow, VolumeUp, VolumeOff, FullscreenExit, Fullscreen, People, SportsEsports } from '@material-ui/icons';
import formatDuration from 'format-duration';
import useMousetrap from 'react-hook-mousetrap';
import screenfull from 'screenfull';
import useDoubleClick from 'use-double-click';

import './Player.css';
import { updateStreamsProgress, fetcher, clamp } from './util.js';
import Loading from './Loading.js';
import Sidebar from './Sidebar.js';
import {isMobile} from 'react-device-detect';

const PlayerPopover = props => {
	if (props.type === 'participants') {
		return (
			<Popover
				id={"popover-participants"}
				open={true}
				anchorEl={props.anchorEl}
				anchorOrigin={{
					vertical: 'top',
					horizontal: 'center',
				}}
				transformOrigin={{
					vertical: 'bottom',
					horizontal: 'center',
				}}
				onClose={props.handleClose}
				freeSolo={true}
			>
				<Autocomplete
					multiple
					options={[ "Peter", "Timon" ]}
					getOptionLabel={(option) => option}
					defaultValue={[]}
					filterSelectedOptions
					renderInput={(params) => (
						<TextField
							{...params}
							label="Personen"
							placeholder="Personen in de video"
						/>
					)}
				/>
			</Popover>
		);
	} else if (props.type === 'games') {
		return <div>TODO</div>;
	}

	return <></>;
};

const Controls = props => {
	useMousetrap('space', () => props.onPlayChange(!props.playing));
	useMousetrap('m', () => props.onMutedChange(!props.muted));
	useMousetrap('f', () => props.onFullscreenChange(!props.fullscreen))
	const seekDelta = delta => {
		const deltaFract = delta / props.video.duration;
		const newValue = props.progress + deltaFract;
		props.onSeek(clamp(newValue, 0, 1));
	};
	useMousetrap('left', () => seekDelta(-10));
	useMousetrap('right', () => seekDelta(10));
	const volumeDelta = delta => {
		const newValue = props.volume + delta;
		props.onVolumeChange(clamp(newValue, 0, 1));
	};
	useMousetrap('up', () => volumeDelta(0.1));
	useMousetrap('down', () => volumeDelta(-0.1));

	return (
		<div className={`video-controls ${props.visible ? 'visible' : ''}`}>
			<div className="controls-row">
				<div className="duration">
					{formatDuration(1000 * props.progress * props.video.duration)} / {formatDuration(1000 * props.video.duration)}
				</div>
			</div>
			<div className="controls-row">
				<IconButton style={{'color': 'white'}} onClick={() => props.onPlayChange(!props.playing)}>
					{ props.playing ? <Pause /> : <PlayArrow /> }
				</IconButton>
				<Slider value={props.progress} max={1} step={0.001} onChange={(_, newValue) => props.onSeek(newValue)} />

				<div className="volume-controls">
					<IconButton style={{'color': 'white'}} onClick={() => props.onMutedChange(!props.muted)}>
						{ props.muted ? <VolumeOff /> : <VolumeUp /> }
					</IconButton>
					<Slider
						value={(props.muted ? 0 : props.volume) * 100}
						valueLabelDisplay="auto"
						min={0}
						max={100}
						step={1}
						disabled={props.muted}
						onChange={(_, x) => props.onVolumeChange(x / 100)} />
				</div>

				<IconButton style={{'color': 'white'}} onClick={() => props.onFullscreenChange(!props.fullscreen)}>
					{ props.fullscreen ? <FullscreenExit /> : <Fullscreen /> }
				</IconButton>

				<IconButton style={{'color': 'white'}} onClick={el => props.onTooltipClick('participants', el.currentTarget)}>
					<People />
				</IconButton>

				<IconButton style={{'color': 'white'}} onClick={el => props.onTooltipClick('games', el.currentTarget)}>
					<SportsEsports />
				</IconButton>
			</div>
		</div>
	);
};

const Video = React.memo(React.forwardRef((props, ref) => {
	const url = `http://local.lieuwe.xyz:6070/stream/${props.video.file_name}`;

	return <div style={{ 'width': '100%', 'height': '100%' }} onClick={props.onClick}>
		<ReactPlayer
			url={url}
			width="100%"
			height="100%"
			playing={props.playing}
			controls={props.controls}
			volume={props.volume}
			ref={ref}
			onStart={props.onStart}
			onProgress={props.onProgress}
			onPause={props.onPause}
			onPlay={props.onPlay}
			progressInterval={250}
		/>
	</div>;
}));

function PauseShade(props) {
	return (
		<div className={`pause-shade ${props.visible ? 'visible' : ''}`}>
			{props.video.file_name}
		</div>
	);
}

function useUpdateProgress(video, playing, progress) {
	const previousUpdateAt = useRef(progress);
	useEffect(() => {
		if (!playing || Math.abs(progress - previousUpdateAt.current) < 5) {
			return;
		}

		previousUpdateAt.current = progress;

		requestIdleCallback(() => {
			(async () => {
				const dict = {};
				dict[video.id] = progress;

				await updateStreamsProgress(dict);
			})().catch(e => console.error(e));
		});
	}, [progress]);
}

function Player(props) {
	const video = props.video;
	const useNativeControls = isMobile;

	// state
	const [volume, setVolume] = useState(() => +localStorage.getItem('volume') || 1);
	const [muted, setMuted] = useState(() => {
		const muted = localStorage.getItem('muted');
		if (muted === 'true') {
			return true;
		} else {
			return false;
		}
	});
	const [progress, setProgress] = useState(props.initialProgress);
	const [playing, setPlaying] = useState(true);
	const [sidebarOpen, setSidebarOpen] = useState(video.has_chat);
	const [userActive, setUserActive] = useState(null);
	const [fullscreen, setFullscreen] = useState(screenfull.isFullscreen);

	const [openTooltip, setOpenTooltip] = useState(null);

	// update document title
	useEffect(() => {
		document.title = `${video.file_name} - Streamwatch`;
	}, [video.file_name]);

	// keep localStorage up-to-date
	useEffect(() => {
		localStorage.setItem('volume', volume);
		localStorage.setItem('muted', muted);
	}, [volume, muted]);

	// sync watch progress
	useUpdateProgress(video, playing, progress);

	// video listeners
	const playerRef = useRef(null);
	const onStart = () => {
		if (playerRef.current != null) {
			playerRef.current.seekTo(props.initialProgress, 'seconds');
		}
	};
	const handleSeek = fract => {
		setProgress(fract * video.duration);
		if (playerRef.current != null) {
			playerRef.current.seekTo(fract, 'fraction');
		}
	};
	const onProgress = ({ playedSeconds }) => setProgress(playedSeconds);

	// click events
	/*
	useDoubleClick({
		onSingleClick: () => setPlaying(!playing),
		onDoubleClick: () => setFullscreen(!fullscreen),
		ref: playerRef,
		latency: 250,
	});
	*/

	// handle user activity
	useEffect(() => {
		if (userActive == null) {
			return;
		}

		const id = setTimeout(() => {
			setUserActive(null);
		}, 4000);

		return () => clearTimeout(id);
	}, [userActive]);

	const wrapperRef = useRef(null);

	// handle fullscreen change requests (made by user)
	useEffect(() => {
		if (wrapperRef.current == null) {
			return;
		} else if (!screenfull.isEnabled) {
			return;
		}

		if (fullscreen) {
			screenfull.request(wrapperRef.current);
		}

		return () => screenfull.exit();
	}, [fullscreen]);

	// handle fullscreen changes (made by browser)
	useEffect(() => {
		const callback = () => setFullscreen(screenfull.isFullscreen);
		screenfull.on('change', callback);
		return () =>  screenfull.off('change', callback);
	}, []);

	return (
		<div className="player">
			<div className={`player-wrapper ${userActive != null ? '' : 'hide-cursor'}`} onPointerMove={() => setUserActive(Date.now())} ref={wrapperRef}>
				<PauseShade video={video} visible={!playing && userActive == null} />

				<Video
					video={video}
					volume={muted ? 0 : volume}
					playing={playing}
					controls={useNativeControls}
					ref={playerRef}
					onStart={onStart}
					onProgress={onProgress}
					onPause={() => setPlaying(false)}
					onPlay={() => setPlaying(true)} />

				{
					openTooltip == null
						? <></>
						: <PlayerPopover
							type={openTooltip[0]}
							anchorEl={openTooltip[1]}
							handleClose={() => setOpenTooltip(null) }/>
				}

				{
					useNativeControls
						? <></>
						: <Controls
							video={video}
							visible={!playing || userActive != null}
							onSeek={handleSeek}
							progress={progress / video.duration}
							volume={volume}
							muted={muted}
							playing={playing}
							fullscreen={fullscreen}
							onPlayChange={x => {
								setPlaying(x);
								setUserActive(Date.now());
							}}
							onVolumeChange={x => {
								setVolume(x);
								setUserActive(Date.now());
							}}
							onMutedChange={x => {
								setMuted(x);
								setUserActive(Date.now());
							}}
							onFullscreenChange={x => {
								setFullscreen(x);
								setUserActive(Date.now());
							}}
							onTooltipClick={(tooltip, el) => setOpenTooltip([ tooltip, el ])}
						/>
				}
			</div>
			{ sidebarOpen ? <Sidebar video={video} progress={progress} playing={playing} /> : <></> }
		</div>
	);
}

export default function PlayerWrapper(props) {
	const { id } = useParams();
	const video = props.videos.find(v => v.id == id);

	const [initialProgress, setInitialProgress] = useState(null);

	useEffect(() => {
		const username = localStorage.getItem('username');
		if (username == null || video == null) {
			setInitialProgress(0);
		} else {
			fetcher(`http://local.lieuwe.xyz:6070/user/${username}/progress`).then(r => setInitialProgress(r[video.id] || 0));
		}
	}, [video]);

	if (video == null) {
		return <div>video not found</div>;
	} else if (initialProgress == null) {
		return <Loading />;
	}

	return <Player video={video} initialProgress={initialProgress} />;
}
