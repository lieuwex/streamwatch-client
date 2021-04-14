import { useParams } from 'react-router-dom';
import ReactPlayer from 'react-player';
import React, { useState, useRef, useEffect, useMemo } from 'react';
import screenfull from 'screenfull';
import useDoubleClick from 'use-double-click';
import { isMobile } from 'react-device-detect';
import { mutate } from 'swr';

import './Player.css';
import { updateStreamsProgress, fetcher, filterGames } from './util.js';
import Loading from './Loading.js';
import Sidebar from './Sidebar.js';
import Controls from './Controls.js';
import PlayerDialog from './Dialogs.js';

async function updateItems(type, streamId, items) {
	if (type === 'participants') {
		await fetch(`http://local.lieuwe.xyz:6070/stream/${streamId}/persons`, {
			method: 'PUT',
			headers: {
				'Content-Type': 'application/json',
			},
			body: JSON.stringify(items.map(p => p.id)),
		});
	} else if (type === 'games') {
		await fetch(`http://local.lieuwe.xyz:6070/stream/${streamId}/games`, {
			method: 'PUT',
			headers: {
				'Content-Type': 'application/json',
			},
			body: JSON.stringify(items.map(g => ({ id: g.id, start_time: g.start_time }))),
		});
	}

	mutate('http://local.lieuwe.xyz:6070/streams');
}

const Video = React.forwardRef((props, ref) => {
	const url = `http://local.lieuwe.xyz:6070/stream/${props.video.file_name}`;

	const wrapperRef = useRef(null);
	useDoubleClick({
		onSingleClick: props.onSingleClick,
		onDoubleClick: props.onDoubleClick,
		ref: wrapperRef,
		latency: 250,
	});

	const onStart = () => {
		if (ref.current != null) {
			ref.current.seekTo(props.initialProgress, 'seconds');
		}
	};

	return <div style={{ 'width': '100%', 'height': '100%' }} ref={wrapperRef}>
		<ReactPlayer
			url={url}
			width="100%"
			height="100%"
			playing={props.playing}
			controls={props.controls}
			volume={props.volume}
			ref={ref}
			onStart={onStart}
			onProgress={props.onProgress}
			onPause={props.onPause}
			onPlay={props.onPlay}
			onBuffer={props.onBuffer}
			onBufferEnd={props.onBufferEnd}
			progressInterval={250}
		/>
	</div>;
});

function PauseShade(props) {
	const games = useMemo(() => {
		const games = filterGames(props.video.games);
		const nodes = new Array(games.length);
		let hitCurrent = false;

		for (let i = nodes.length - 1; i >= 0; i--) {
			const g = games[i];
			const isActive = g.start_time <= props.progress;
			const current = !hitCurrent && isActive;
			hitCurrent = hitCurrent || isActive;

			nodes[i] = (
				<span key={i} data-current={current}>
					{g.name}
					{g.platform == null ? <></> : <small> ({g.platform})</small>}
				</span>
			);
		}

		return nodes;
	}, [props.video.games, props.progress]);

	return (
		<div className={`pause-shade ${props.visible ? 'visible' : ''}`}>
			<div>{props.video.file_name}</div>
			<div className="games">{games}</div>
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
			updateStreamsProgress({
				[video.id]: progress,
			}).catch(e => console.error(e));
		}, { timeout: 4000 });
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
	const [buffering, setBuffering] = useState(true);
	const [sidebarOpen, setSidebarOpen] = useState(video.has_chat);
	const [userActive, setUserActive] = useState(false);
	const [fullscreen, setFullscreen] = useState(screenfull.isFullscreen);

	const [openDialog, setOpenDialog] = useState(null);

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
	const handleSeek = fract => {
		setProgress(fract * video.duration);
		if (playerRef.current != null) {
			playerRef.current.seekTo(fract, 'fraction');
		}
	};
	const onProgress = ({ playedSeconds }) => setProgress(playedSeconds);

	// handle user activity
	const activeTimeout = useRef(null);
	useEffect(() => {
		// make sure the timeout is cleared when leaving the page
		return () => clearTimeout(activeTimeout.current);
	}, []);
	const markActive = () => {
		setUserActive(true);

		clearTimeout(activeTimeout.current);
		activeTimeout.current = setTimeout(() => {
			setUserActive(false);
		}, 4000);
	};
	useEffect(() => {
		// mark active user on player open
		markActive();
	}, []);

	// handle fullscreen change requests (made by user)
	const wrapperRef = useRef(null);
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

	const onDialogClose = (items, newProgress) => {
		if (items != null) {
			requestIdleCallback(() => {
				updateItems(openDialog[0], video.id, items)
					.catch(e => console.error(e));
			}, { timeout: 1000 });
		}

		if (newProgress == null) {
			setPlaying(openDialog[2]);
		} else {
			handleSeek(newProgress / video.duration);
			setPlaying(true);
		}

		setOpenDialog(null);
	};

	return (
		<div className="player">
			<div className={`player-wrapper ${!userActive && playing ? 'hide-cursor' : ''}`} onPointerMove={() => markActive()} ref={wrapperRef}>
				{ buffering ? <Loading /> : <></> }

				{
					playing
					? <></>
					: <PauseShade
						video={video}
						visible={!playing && !userActive}
						progress={progress} />
				}

				<Video
					video={video}
					volume={muted ? 0 : volume}
					playing={playing}
					initialProgress={props.initialProgress}
					controls={useNativeControls}
					ref={playerRef}
					onProgress={onProgress}
					onPause={() => setPlaying(false)}
					onPlay={() => setPlaying(true)}
					onBuffer={() => setBuffering(true)}
					onBufferEnd={() => setBuffering(false)}
					onSingleClick={() => setPlaying(!playing)}
					onDoubleClick={() => setFullscreen(!fullscreen)} />

				{
					openDialog == null
						? <></>
						: <PlayerDialog
							type={openDialog[0]}
							anchorEl={openDialog[1]}
							video={video}
							currentTime={progress}
							handleClose={onDialogClose}/>
				}

				{
					useNativeControls
						? <></>
						: <Controls
							video={video}
							visible={!playing || userActive}
							onSeek={handleSeek}
							progress={progress / video.duration}
							volume={volume}
							muted={muted}
							playing={playing}
							fullscreen={fullscreen}
							sidebarOpen={sidebarOpen}
							onPlayChange={x => {
								setPlaying(x);
								markActive();
							}}
							onVolumeChange={x => {
								setVolume(x);
								markActive();
							}}
							onMutedChange={x => {
								setMuted(x);
								markActive();
							}}
							onFullscreenChange={x => {
								setFullscreen(x);
								markActive();
							}}
							onTooltipClick={(tooltip, el) => {
								setOpenDialog([ tooltip, el, playing ]);
								setPlaying(false);
								markActive();
							}}
							onSidebarChange={x => {
								setSidebarOpen(x);
								markActive();
							}}
						/>
				}
			</div>
			<Sidebar video={video} progress={progress} playing={playing} visible={sidebarOpen} />
		</div>
	);
}

export default function PlayerWrapper(props) {
	const { id } = useParams();
	const video = props.videos.find(v => v.id == id);

	if (video == null) {
		return <div>video not found</div>;
	}

	return <Player video={video} initialProgress={video.progress || 0} />;
}
