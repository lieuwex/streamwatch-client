import React, { useEffect, useMemo, useState, useRef, useImperativeHandle, forwardRef } from 'react';

import swr from 'swr';
import { Slider, Button, IconButton, Tooltip, Popper } from '@mui/material';
import { Pause, MovieCreation, PlayArrow, VolumeUp, VolumeOff, FullscreenExit, Fullscreen, People, SportsEsports, ChevronLeft, ChevronRight, Info } from '@mui/icons-material';
import formatDuration from 'format-duration';
import useMousetrap from 'react-hook-mousetrap';
import NumberEasing from 'react-number-easing';
import { isMobile } from 'react-device-detect';
import HypeGraph from './HypeGraph.js';

import { clamp, getCurrentDatapoint, fetcher } from './util.js';
import { getName } from './users.js';

const ScrubPreview = forwardRef(function ScrubPreview(props, ref) {
	const [popperOpen, setPopperOpen] = useState(false);
	const positionRef = useRef({ x: 0, y: 0 });
	const popperRef = useRef(null);
	const [imageId, setImageId] = useState(0);

	useImperativeHandle(ref, () => ({
		update: (x, y) => {
			positionRef.current = { x, y };
			popperRef.current?.update();

			const rect = props.controlsRowRef.current?.getBoundingClientRect();
			if (!rect || !popperOpen) {
				return;
			}

			const left = rect.left;
			const right = rect.right;

			const frac = (x - left) / right;

			// REVIEW: hier lijkt geen sikkepit van te kloppen
			setImageId(Math.round((props.video.scrub_thumbnail_count - 1) * frac));

			//console.log(x, rect, frac, imageId);
		},
		setOpen: open => setPopperOpen(open),
	}));

	const thumbnails = useMemo(() => {
		const res = [];

		for (let i = 0; i < props.video.scrub_thumbnail_count; i++) {
			const url = `https://streams.lieuwe.xyz/scrub_thumbnail/${props.video.id}/${i}.webp`;
			const shown = i === imageId;

			res.push(
				<img key={i} src={url} decoding="sync" style={{
					width: '200px',
					height: 'auto',
					borderRadius: '10px',

					display: shown ? 'block' : 'none',
				}} />
			);
		}

		return res;
	}, [imageId, props.video.id]);

	useEffect(() => {
		// preload all images
		for (const img of thumbnails) {
			const preloadLink = document.createElement("link");
			preloadLink.href = img.props.src;
			preloadLink.rel = "preload";
			preloadLink.as = "image";
			document.head.appendChild(preloadLink);
		}

		// delete all image preloads
		return () => document.querySelectorAll('head link[rel="preload"][as="image"]').forEach(el => el.remove());
	}, [props.video.id])

	return (
		<Popper open={popperOpen}
				keepMounted={true}
				popperRef={popperRef}
				style={{ pointerEvents: 'none' }}
				anchorEl={{
					getBoundingClientRect: () => {
						return new DOMRect(
							positionRef.current.x,
							props.controlsRowRef.current?.getBoundingClientRect().y,
							0,
							0,
						);
					},
				}}>

			<div style={{ boxShadow: '0px 0px 66px -21px rgba(0,0,0,0.87)' }}>
				{thumbnails}
			</div>
		</Popper>
	);
});

function SkipIntroButton(props) {
	const video = props.video;
	const progressSecs = props.progressSecs;

	const skipTo = useMemo(() => {
		const introDuration = 43; // seconds
		const lekkerWachtens = video.games.filter(g => g.id === 7);

		for (let i = lekkerWachtens.length - 1; i >= 0; i--) {
			const start = lekkerWachtens[i].start_time;
			if (progressSecs > start && progressSecs < (start + introDuration)) {
				return start + introDuration;
			}
		}

		if (progressSecs < introDuration) {
			return introDuration;
		}

		return null;
	}, [progressSecs]);

	const skipIntro = () => {
		if (skipTo == null) {
			console.warn('skipInto called while skipTo is null');
			return;
		}

		props.onSeek(skipTo / video.duration);
	};

	if (skipTo == null) {
		return null;
	}

	return (
		<Button
			style={{
				'color': 'white',
				'border-color': 'white',
				'float': 'right',
				'margin': '10px',
			}}
			variant="outlined"
			onClick={skipIntro}
		>
			Skip intro
		</Button>
	);
}

export function IButton(props) {
	const onClick = e => {
		document.activeElement.blur();
		return props.onClick(e);
	};

	return (
		<IconButton style={{'color': 'white'}} disableFocusRipple={true} onClick={onClick}>
			{props.children}
		</IconButton>
	)
}

function useKeyBindings(props) {
	const wrap = fn => {
		return e => {
			e.stopImmediatePropagation();
			e.preventDefault();

			fn();
		};
	};

	useMousetrap('space', wrap(() => props.onPlayChange(!props.playing)));
	useMousetrap('m', wrap(() => props.onMutedChange(!props.muted)));
	useMousetrap('f', wrap(() => props.onFullscreenChange(!props.fullscreen)));
	useMousetrap('s', wrap(() => props.onSidebarChange(!props.sidebarOpen)));
	useMousetrap('e', wrap(() => props.onSetLW()));
	const seekDelta = delta => {
		const deltaFract = delta / props.video.duration;
		const newValue = props.progress + deltaFract;
		props.onSeek(clamp(newValue, 0, 1));
	};
	useMousetrap('left', wrap(() => seekDelta(-10)));
	useMousetrap('right', wrap(() => seekDelta(10)));
	const volumeDelta = delta => {
		const newValue = props.volume + delta;
		props.onVolumeChange(clamp(newValue, 0, 1));
	};
	useMousetrap('up', wrap(() => volumeDelta(0.1)));
	useMousetrap('down', wrap(() => volumeDelta(-0.1)));
}

function useMarkers(props, username) {
	const { data } = swr(
		props.clip == null
			? `https://streams.lieuwe.xyz/api/stream/${props.video.id}/otherProgress`
			: null,
		fetcher,
		{
			refreshInterval: 5 * 1000, // 5 seconds
		},
	);

	return useMemo(() => {
		const otherProgress = data || {};
		return Object.entries(otherProgress).map(([uname, time]) => {
			if (uname === username) {
				return <></>;
			}

			const fract = time / props.video.duration;

			return <Tooltip key={uname} title={getName(uname)} placement="top" arrow>
				<div
					className="progress-marker"
					style={{ 'left': `${100 * fract}%` }}
					onClick={() => props.onSeek(fract)}
				/>
			</Tooltip>;
		});
	}, [data]);
}

export default function Controls(props) {
	useKeyBindings(props);

	const username = useMemo(() => localStorage.getItem('username') || null, []);

	const [hypegraphUpdateTime, setHypegraphUpdateTime] = useState(() => Date.now());
	useEffect(() => setHypegraphUpdateTime(Date.now()), [props.fullscreen, props.sidebarOpen]);

	const controlsRowRef = useRef(null);
	const previewRef = useRef(null);

	const datapoint = getCurrentDatapoint(props.video, props.progress);
	const viewcount = datapoint == null ? null : datapoint.viewcount;

	const [start, end] = props.region;
	const min = start / props.video.duration;
	const max = end / props.video.duration;

	const progressSecs = props.progress * props.video.duration;

	const markers = useMarkers(props, username);

	if (!props.visible) {
		return <></>;
	}

	return (
		<div className={`video-controls ${props.visible ? 'visible' : ''}`}>
			<div className="controls-row information" style={{'flex-direction': 'row-reverse'}}>
				<SkipIntroButton video={props.video} progressSecs={progressSecs} onSeek={props.onSeek} />
			</div>

			<div className="controls-row information">
				<div className="duration fixed-width-num">
					{formatDuration(1000 * (progressSecs - start))} / {formatDuration(1000 * (end - start))}
				</div>
				{
					viewcount == null
					? <></>
					: <div className="view-count fixed-width-num">
						{/*<Visibility sx={{ color: 'white' }} />*/}
						<NumberEasing
							value={viewcount}
							speed={1000}
							ease="expoOut" />
					</div>
				}
			</div>

			<div className="controls-row">
				<IButton onClick={() => props.onPlayChange(!props.playing)}>
					{ props.playing ? <Pause /> : <PlayArrow /> }
				</IButton>

				<div
					className="slider-container"
					onMouseMove={e => previewRef.current?.update(e.clientX, e.clientY)}
					onMouseEnter={() => previewRef.current?.setOpen(true)}
					onMouseLeave={() => previewRef.current?.setOpen(false)}
					ref={controlsRowRef}
				>
					<HypeGraph
						video={props.video}
						region={props.region}
						smooth={(props.region[1] - props.region[0]) >= 30}
						updateTime={hypegraphUpdateTime} />
					{markers}

					{
						isMobile || props.clip != null
						? <></>
						: <ScrubPreview ref={previewRef} controlsRowRef={controlsRowRef} video={props.video} />
					}

					<Slider
						value={props.progress}
						min={min} max={max} step={0.00001}
						componentsProps={{
							input: {
								className: 'mousetrap',
							},
						}}
						onChange={(_, newValue) => props.onSeek(newValue)}
					/>
				</div>

				{
					isMobile
					? <></>
					: <div className="volume-controls">
						<IButton onClick={() => props.onMutedChange(!props.muted)}>
							{ props.muted ? <VolumeOff /> : <VolumeUp /> }
						</IButton>
						<Slider
							value={props.muted ? 0 : props.volume*100}
							valueLabelDisplay="auto"
							valueLabelFormat={x => Math.floor(x).toString()}
							min={0}
							max={100}
							step={1}
							disabled={props.muted}
							onChange={(_, x) => props.onVolumeChange(x / 100)} />
					</div>
				}

				{
					isMobile || props.clip != null
					? <></>
					: <IButton onClick={el => props.onTooltipClick('participants', el.currentTarget)}>
						<People />
					</IButton>
				}
				{
					isMobile || props.clip != null
					? <></>
					: <IButton onClick={el => props.onTooltipClick('games', el.currentTarget)}>
						<SportsEsports />
					</IButton>
				}
				{
					isMobile || username == null || !(props.clip == null || props.clip.author_username === username)
					? <></>
					: <IButton onClick={el => props.onTooltipClick('clipper', el.currentTarget)}>
						<MovieCreation />
					</IButton>
				}
				{
					isMobile || props.clip != null
					? <></>
					: <IButton onClick={el => props.onTooltipClick('metadata', el.currentTarget)}>
						<Info />
					</IButton>
				}

				{
					// TODO: make the fullscreen button work, we should rotate
					// the screen in a way to landspace to make it somewhat
					// useful.  Or we can just only fullscreen the video element
					isMobile
					? <></>
					: <IButton onClick={() => props.onFullscreenChange(!props.fullscreen)}>
						{ props.fullscreen ? <FullscreenExit /> : <Fullscreen /> }
					</IButton>
				}

				{
					isMobile || !props.video.has_chat
						? <></>
						: <IButton onClick={() => props.onSidebarChange(!props.sidebarOpen)}>
							{ props.sidebarOpen ? <ChevronRight /> : <ChevronLeft /> }
						</IButton>
				}
			</div>
		</div>
	);
};
