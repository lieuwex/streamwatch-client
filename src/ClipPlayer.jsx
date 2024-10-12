import { useParams, Link } from 'react-router-dom';
import ReactPlayer from 'react-player';
import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import screenfull from 'screenfull';
import useDoubleClick from 'use-double-click';
import { isMobile } from 'react-device-detect';
import { mutate } from 'swr';

import './Player.css';
import { updateStreamsProgress, addClipView, filterGames, getTitle, formatDate, getCurrentUrl } from './util.js';
import Loading from './Loading.js';
import Sidebar from './Sidebar.js';
import Controls from './Controls.js';
import PlayerDialog from './Dialogs.js';
import useStreams from './streamsHook.js';
import { getName } from './users.js';

export const Video = React.forwardRef((props, ref) => {
	const part = props.part;

	const wrapperRef = useRef(null);
	useDoubleClick({
		onSingleClick: props.onSingleClick,
		onDoubleClick: props.onDoubleClick,
		ref: wrapperRef,
		latency: 250,
	});

	let content;
	if (part.type === 'clip') {
		const url = `https://streams.lieuwe.xyz/stream/${p.video.file_name}`;

		const onProgress = ({ playedSeconds }) => {
			props.onProgress({
				playedSeconds: part.at/1e3 + playedSeconds,
			});
		};

		content = <ReactPlayer
				url={url}
				width="100%"
				height="100%"
				playing={props.playing}
				controls={props.controls}
				volume={props.volume}
				ref={ref}
				onStart={onStart}
				onProgress={onProgress}
				onPause={props.onPause}
				onPlay={props.onPlay}
				onBuffer={props.onBuffer}
				onBufferEnd={props.onBufferEnd}
				progressInterval={250}
			/>;
	} else if (part.type === 'intermezzo') {
		const startedAt = performance.now();
		let id;
		id = setInterval(() => {
			const diff = performance.now() - startedAt;
			if (diff >= part.duration) {
				clearInterval(id);
				return;
			}

			props.onProgress({
				playedSeconds: (part.at + diff) / 1e3,
			});
		}, 100);

		content = <div className="intermezzo">
			X seconds later...
		</div>;
	}

	return <div style={{ 'width': '100%', 'height': '100%' }} ref={wrapperRef}>
		{content}
	</div>;
});

function PauseShade(props) {
	const [title, hasNiceTitle] = getTitle(props.video, false);

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
			{
				!hasNiceTitle
				? <></>
				: <div className="date">
					{formatDate(props.video.date)}
				</div>
			}
			<div className="title">{title}</div>
			<div className="games">{games}</div>
		</div>
	);
}

function useMediaSession(video) {
	useState(() => {
		if (!('mediaSession' in navigator)) {
			return;
		}

		const [title, _] = getTitle(video, true);

		navigator.mediaSession.metadata = new window.MediaMetadata({
			title: title,
			artist: video.persons.map(g => g.name).join(', '),
			artwork: [{
				src: `https://streams.lieuwe.xyz/thumbnail/${video.id}/0.webp`,
				sizes: '1920x1080', // TODO: this might not always be the case, actually
				type: 'image/webp',
			}]
		});

		return () => navigator.mediaSession.metadata = null;
	}, [video.id]);
}

function Player(props) {
	const video = props.video;
	const clip = props.clip;
	const useNativeControls = isMobile;

	const playingAsClip = clip != null;
	const loop = playingAsClip;

	let region = [ 0, video.duration ];
	if (clip != null) {
		region = [ clip.start_time, clip.start_time+clip.duration ];
	}

	// state
	const [volume, setVolume] = useState(() => +localStorage.getItem('volume') || 1);
	const [muted, setMuted] = useState(() => {
		const muted = localStorage.getItem('muted');
		return muted === 'true';
	});
	const [progress, setProgress] = useState(props.initialProgress);
	const [playing, setPlaying] = useState(true);
	const [buffering, setBuffering] = useState(true);
	const [sidebarOpen, setSidebarOpen] = useState(video.has_chat);
	const [userActive, setUserActive] = useState(false);
	const [fullscreen, setFullscreen] = useState([ screenfull.isFullscreen, sidebarOpen ]);
	const [openDialog, setOpenDialog] = useState(null);

	// update document title
	useEffect(() => {
		if (clip != null) {
			document.title = `${clip.title} - Streamwatch`;
		} else {
			const [title, _] = getTitle(video, true);
			document.title = `${title} - Streamwatch`;
		}
	}, []);

	// keep localStorage up-to-date
	useEffect(() => {
		localStorage.setItem('volume', volume);
		localStorage.setItem('muted', muted);
	}, [volume, muted]);

	// sync watch progress
	useUpdateProgress(video, playingAsClip, playing, progress);

	// update mediaSession information
	useMediaSession(video);

	// video listeners
	const playerRef = useRef(null);
	const handleSeek = (fract, broadcast = true) => {
		setProgress(fract * video.duration);
		if (playerRef.current != null) {
			playerRef.current.seekTo(fract, 'fraction');
		}
	};
	const onProgress = ({ playedSeconds }) => {
		const outbounds = playedSeconds < region[0] || playedSeconds >= region[1];
		if (loop && outbounds) {
			playerRef.current?.seekTo(region[0], 'seconds');
			setProgress(region[0]);

			requestIdleCallback(() => {
				addClipView(clip.id).catch(e => console.error(e));
			}, { timeout: 500 });
		} else {
			setProgress(playedSeconds);
		}
	};

	// handle user activity
	const activeTimeout = useRef(null);
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

		// make sure the timeout is cleared when leaving the page
		return () => clearTimeout(activeTimeout.current);
	}, []);
	const wrapMarkActive = fn => {
		return (...args) => {
			markActive();
			return fn(...args);
		};
	};

	const changeFullscreen = useCallback(newValue => {
		if (fullscreen[0] === newValue) {
			return;
		}

		if (newValue) {
			setFullscreen([ true, sidebarOpen ]);
			setSidebarOpen(false);
		} else {
			setFullscreen([ false, false ]);
			setSidebarOpen(fullscreen[1]);
		}
	}, [...fullscreen, sidebarOpen]);

	// handle fullscreen change requests (made by user)
	useEffect(() => {
		if (!screenfull.isEnabled) {
			return;
		}

		if (fullscreen[0]) {
			screenfull.request(window.document.body);
		}

		return () => screenfull.exit();
	}, [fullscreen[0]]);

	// handle fullscreen changes (made by browser)
	useEffect(() => {
		const callback = () => {
			changeFullscreen(screenfull.isFullscreen);
		};
		screenfull.on('change', callback);
		return () =>  screenfull.off('change', callback);
	}, [changeFullscreen]);

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
			<div className={`player-wrapper ${!userActive && playing ? 'hide-cursor' : ''}`} onPointerMove={() => markActive()}>
				{ buffering && !useNativeControls ? <Loading position="absolute" /> : <></> }

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
					controls={useNativeControls}
					ref={playerRef}
					onProgress={onProgress}
					onPause={wrapMarkActive(() => setPlaying(false))}
					onPlay={wrapMarkActive(() => setPlaying(true))}
					onBuffer={() => setBuffering(true)}
					onBufferEnd={() => setBuffering(false)}
					onSingleClick={wrapMarkActive(() => setPlaying(!playing))}
					onDoubleClick={wrapMarkActive(() => changeFullscreen(!fullscreen[0]))} />

				{
					openDialog == null
						? <></>
						: <PlayerDialog
							type={openDialog[0]}
							anchorEl={openDialog[1]}
							video={video}
							clip={clip}
							currentTime={progress}
							handleClose={onDialogClose}/>
				}

				{
					useNativeControls
						? <></>
						: <Controls
							video={video}
							clip={clip}
							visible={!playing || userActive}
							onSeek={handleSeek}
							progress={progress / video.duration}
							region={region}
							volume={volume}
							muted={muted}
							playing={playing}
							fullscreen={fullscreen[0]}
							sidebarOpen={sidebarOpen}
							onPlayChange={wrapMarkActive(x => setPlaying(x))}
							onVolumeChange={wrapMarkActive(x => setVolume(x))}
							onMutedChange={wrapMarkActive(x => setMuted(x))}
							onFullscreenChange={wrapMarkActive(x => changeFullscreen(x))}
							onSidebarChange={wrapMarkActive(x => setSidebarOpen(x))}
							onTooltipClick={(tooltip, el) => {
								setOpenDialog([ tooltip, el, playing ]);
								setPlaying(false);
								markActive();
							}}
							onSetLW={() => {
								if (!window.confirm("Einde LW nu instellen?")) {
									return;
								}

								let items = video.games.filter(g => g.id !== 7);
								items.push({ id: 7, start_time: progress });
								items.sort((a, b) => a.start_time < b.start_time);

								requestIdleCallback(() => {
									updateItems('games', video.id, items).catch(e => console.error(e));
								}, { timeout: 1000 });
							}}
						/>
				}
			</div>
			{
				video.has_chat
					? <Sidebar video={video} progress={progress} playing={playing} visible={sidebarOpen} region={region} />
					: <></>
			}
		</div>
	);
}

export default function PlayerWrapper(props) {
	const { isLoading, clips: clipsInfo, streams: streamsInfo } = useStreams();
	const clips = clipsInfo[0];
	const videos = streamsInfo[0];

	const { id } = useParams();

	if (isLoading) {
		return <Loading />;
	}

	const clip = clips.find(c => c.id === +id);
	if (clip == null) {
		return <div>clip not found</div>;
	}

	const initialProgress = clip.start_time;

	return <div className={`player-root ${clip == null ? 'stream' : 'clip'}`}>
		<div className="clip-info">
			<h1 className="clip-header">{clip.title}</h1>
			<h2 className="clip-subheader">door {getName(clip.author_username)}</h2>
		</div>
		<Player video={videos} clip={clip} initialProgress={initialProgress} />
	</div>;
}
