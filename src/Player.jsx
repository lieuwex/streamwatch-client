import { useParams, Link } from 'react-router-dom';
import ReactPlayer from 'react-player/file';
import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import screenfull from 'screenfull';
import useDoubleClick from 'use-double-click';
import { useDoubleTap } from 'use-double-tap';
import { isMobile } from 'react-device-detect';
import { mutate } from 'swr';

import './Player.css';
import { updateStreamsProgress, addClipView, filterGames, getTitle, formatDate, getCurrentUrl, useRequireLogin, clamp } from './util.js';
import Loading from './Loading';
import Sidebar from './Sidebar';
import Controls from './Controls';
import PlayerDialog from './Dialogs';
import useStreams from './streamsHook';
import { getName } from './users.js';
import {createPortal} from 'react-dom';
import {clipTitleRename} from './emoticons';

const CLIP_VIEW_FRACT = 0.7;
const CLIP_VIEW_MARGIN_SEC = 3;

const id = () => null;

async function updateItems(type, streamId, items) {
	const send = (type, body) => {
		return fetch(`https://streams.lieuwe.xyz/api/stream/${streamId}/${type}`, {
			method: 'PUT',
			headers: {
				'Content-Type': 'application/json',
			},
			body: JSON.stringify(body),
		});
	};

	if (type === 'participants') {
		await send('persons', items.map(p => p.id));
	} else if (type === 'games') {
		await send('games', items.map(g => ({ id: g.id, start_time: g.start_time })));
	} else if (type === 'metadata') {
		await send('title', items);
	}

	mutate('https://streams.lieuwe.xyz/api/streams');
}

function sendPartyMessage(msg) {
	if (window.partyWs == null) {
		return;
	}

	msg['sender'] = window.partySelfId;

	console.info('sending to party', msg);
	window.partyWs.send(JSON.stringify(msg));
}

export const Video = React.forwardRef((props, ref) => {
	const url = `https://streams.lieuwe.xyz/stream/${props.video.file_name}`;

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

function useCanvasThing() {
	const video = document.querySelector('video');
	const canvas = document.querySelector('canvas');

	if (!video || !canvas) {
		return;
	}

	if (window.blah) {
		return;
	}

	let step;

	const ctx = canvas.getContext("2d");

	const draw = () => {
		ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
	};

	const drawLoop = () => {
		draw();
		step = window.requestAnimationFrame(drawLoop);
	};

	const drawPause = () => {
		window.cancelAnimationFrame(step);
		step = undefined;
	};

	// Initialize
	video.addEventListener("loadeddata", draw, false);
	video.addEventListener("seeked", draw, false);
	video.addEventListener("play", drawLoop, false);
	video.addEventListener("pause", drawPause, false);
	video.addEventListener("ended", drawPause, false);

	window.blah = true;
}

function PauseShade(props) {
	const [title, hasNiceTitle] = getTitle(props.video, false, props.progress / props.video.duration);

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

function SkipAreas(props) {
	const left = useDoubleTap(() => props.onLeft());
	const right = useDoubleTap(() => props.onRight());

	return <>
		<div className='skip-area left' {...left}></div>
		<div className='skip-area right' {...right}></div>
	</>;
}

function useUpdateProgress(video, playingAsClip, playing, progress) {
	const previousUpdateAt = useRef(progress);
	useEffect(() => {
		if (playingAsClip) {
			return;
		} else if (!playing || Math.abs(progress - previousUpdateAt.current) < 5) {
			return;
		}

		previousUpdateAt.current = progress;

		if (progress < 1) {
			// When watching on mobile and reopening the web browser after it
			// has been backgrounded, sometimes streamwatch sends a progress
			// update with a time of 0.0.
			// To cirumvent this, don't send progress updates when the progress
			// is less than 1 second (just to be safe).
			return;
		}

		requestIdleCallback(() => {
			updateStreamsProgress({
				[video.id]: progress,
			}).catch(e => console.error(e));
		}, { timeout: 4000 });
	}, [progress]);
}

function useMediaSession(video, progress) {
	const [title, _] = useMemo(() => {
		return getTitle(video, true, progress / video.duration);
	}, [video.id, progress]);

	useEffect(() => {
		if (!('mediaSession' in navigator)) {
			return;
		}

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
	}, [video.id, title]);
}

function useAutoplay(progress, region, video, playingAsClip) {
	const navigate = useNavigate();

	const { isLoading, streams: streamsInfo } = useStreams();
	const streams = streamsInfo[0];

	useEffect(() => {
		if (playingAsClip || isLoading || progress < region[1] - 1.0) {
			return;
		}

		// get the last watched stream that is still in progress and which has
		// more than 5 minutes left to watch
		let stream = streams
			.filter(v => v.inProgress && v.duration - v.progress.time >= (60 * 5))
			.sort((a, b) => b.progress.real_time - a.progress.real_time)[0];

		// otherwise, get the next unfinished stream in chronological order
		if (stream == null) {
			stream = streams
				.filter(v => !v.finished && v.timestamp > video.timestamp)
				.sort((a, b) => a.timestamp - b.timestamp)[0];
		}

		// otherwise, get the previous unfinished stream in chronological order
		if (stream == null) {
			stream = streams
				.filter(v => !v.finished && v.id !== video.id)
				.sort((a, b) => b.timestamp - a.timestamp)[0];
		}

		if (stream != null) {
			document.location.href = `/video/${stream.id}`;
		}
	}, [progress, region[1], video, playingAsClip, isLoading, streams]);
}

function Player(props) {
	const video = props.video;
	const clip = props.clip;
	const useNativeControls = false;

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
	const title = useMemo(() => {
		if (clip != null) {
			return clip.title;
		} else {
			const [title, _] = getTitle(video, true, progress / video.duration);
			return title;
		}
	})
	useEffect(() => { document.title = `${title} - Streamwatch`; }, [title]);
	useRequireLogin(!playingAsClip);

	// keep localStorage up-to-date
	useEffect(() => {
		localStorage.setItem('volume', volume);
		localStorage.setItem('muted', muted);
	}, [volume, muted]);

	// sync watch progress
	useUpdateProgress(video, playingAsClip, playing, progress);

	// update mediaSession information
	useMediaSession(video, progress);

	// video listeners
	const clipViewMarked = useRef(false);
	const playerRef = useRef(null);
	const handleSeek = (fract, broadcast = true) => {
		setProgress(fract * video.duration);
		if (playerRef.current != null) {
			playerRef.current.seekTo(fract, 'fraction');
		}

		if (broadcast) {
			sendPartyMessage({
				command: 'seek',
				args: [fract],
			});
		}
	};
	const onProgress = ({ playedSeconds }) => {
		const before = playedSeconds < region[0];
		const behind = playedSeconds > region[1];
		const outbounds = before || behind;

		const fract = (playedSeconds-region[0]) / (region[1]-region[0]);
		const markClipView = (
			playingAsClip &&
			!clipViewMarked.current &&
			((fract >= CLIP_VIEW_FRACT) || ((region[1]-playedSeconds) <= CLIP_VIEW_MARGIN_SEC))
		);
		if (markClipView) {
			console.log(
				'playing as clip',
				fract, '>=', CLIP_VIEW_FRACT, `(${fract >= CLIP_VIEW_FRACT})`,
				'or',
				region[1]-playedSeconds, '<=', CLIP_VIEW_MARGIN_SEC, `(${(region[1]-playedSeconds) <= CLIP_VIEW_MARGIN_SEC})`,
				'and !clipViewMarked',
				'therefore submitting clip view'
			);
			addClipView(clip.id).catch(e => console.error(e));
			clipViewMarked.current = true;
		}

		if (loop && outbounds) {
			playerRef.current?.seekTo(region[0], 'seconds');
			setProgress(region[0]);
			clipViewMarked.current = false;
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
			let el = window.document.body;
			if (isMobile) {
				el = document.getElementsByTagName('video')[0];
			}

			screenfull.request(el);
		}

		return () => screenfull.exit();
	}, [fullscreen[0]]);

	// handle fullscreen changes (made by browser)
	useEffect(() => {
		if (screenfull.on == null) {
			return;
		}

		const callback = () => {
			changeFullscreen(screenfull.isFullscreen);
		};
		screenfull.on('change', callback);
		return () =>  screenfull.off('change', callback);
	}, [changeFullscreen]);

	// watch parties receiver
	useEffect(() => {
		if (window.partyWs == null) {
			return;
		}

		window.partyWs.onmessage = e => {
			const obj = JSON.parse(e.data);

			if (obj['sender'] === window.partySelfId) {
				console.info('ignoring party message of our own', obj);
				return;
			}

			console.info('received partyWs command', obj);

			const command = obj['command'];
			const args = obj['args'];

			switch (command) {
			case 'playing':
				setPlaying(args[0]);
				break;
			case 'seek':
				handleSeek(args[0], false);
				break;
			default:
				console.warn('received unknown partyWs command', obj);
				break;
			}
		};

		return () => window.partyWs.onmessage = null;
	}, []);
	// watch parties playing state sender
	useEffect(() => {
		sendPartyMessage({
			command:'playing',
			args: [playing],
		});
	}, [playing]);

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

	useCanvasThing(playing);

	useAutoplay(progress, region, video, playingAsClip);

	const seekDelta = delta => {
		const newValue = progress + delta;
		handleSeek(clamp(newValue / video.duration, 0, 1));
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

				{
					!isMobile
					? <></>
					: <SkipAreas
						video={video}
						progress={progress / video.duration}
						onLeft={wrapMarkActive(() => seekDelta(-10))}
						onRight={wrapMarkActive(() => seekDelta(10))}
					/>
				}

				<Video
					video={video}
					volume={muted ? 0 : volume}
					playing={playing}
					initialProgress={props.initialProgress}
					controls={useNativeControls}
					ref={playerRef}
					onProgress={onProgress}
					onPause={wrapMarkActive(() => setPlaying(false))}
					onPlay={wrapMarkActive(() => setPlaying(true))}
					onBuffer={() => setBuffering(true)}
					onBufferEnd={() => setBuffering(false)}
					onSingleClick={wrapMarkActive(isMobile ? id : () => setPlaying(!playing))}
					onDoubleClick={wrapMarkActive(isMobile ? id : () => changeFullscreen(!fullscreen[0]))} />

				{createPortal(<canvas/>, document.body)}

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
							onSeek={wrapMarkActive(handleSeek)}
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

function getUrlProgress() {
	const url = getCurrentUrl();
	const s = url.searchParams.get('s');
	return (
		s == null
		? null
		: Number.parseInt(s)
	);
};

export default function PlayerWrapper(props) {
	const { isLoading, clips: clipsInfo, streams: streamsInfo } = useStreams();
	const clips = clipsInfo[0];
	const videos = streamsInfo[0];

	const { id } = useParams();

	window.blah = false;

	if (isLoading) {
		return <Loading />;
	}

	let videoId, clip;
	if (props.isClip) {
		clip = clips.find(c => c.id === +id);
		if (clip == null) {
			return <div>clip not found</div>;
		}

		videoId = clip.stream_id;
	} else {
		videoId = id;
	}

	const video = videos.find(v => v.id === +videoId);
	if (video == null) {
		return <div>video not found</div>;
	}

	let initialProgress = getUrlProgress() || video.progress?.time || 0;
	if (initialProgress === 0) { // jump to end of LW
		const game = video.games.find(g => g.id === 7);
		if (game != null) {
			initialProgress = game.start_time;
		}
	}

	if (clip != null) {
		initialProgress = clip.start_time;
	}

	let clipInfo = <></>;
	if (clip != null) {
		clipInfo = (
			<div className="clip-info">
				<Link to={`/video/${video.id}`} className="clip-stream-link">
					Uit stream: {getTitle(video, true)}
				</Link>

				<h1 className="clip-header" dangerouslySetInnerHTML={{__html: clipTitleRename(clip.title)}} />
				<h2 className="clip-subheader">door {getName(clip.author_username)}</h2>
			</div>
		);
	}

	return <div className={`player-root ${clip == null ? 'stream' : 'clip'}`}>
		{clipInfo}
		<Player video={video} clip={clip} initialProgress={initialProgress} />
	</div>;
}
