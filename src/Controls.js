import React, { useEffect, useMemo, useState } from 'react';

import swr from 'swr';
import { Slider, IconButton, Tooltip } from '@mui/material';
import { Pause, MovieCreation, PlayArrow, VolumeUp, VolumeOff, FullscreenExit, Fullscreen, People, SportsEsports, ChevronLeft, ChevronRight, Info } from '@mui/icons-material';
import formatDuration from 'format-duration';
import useMousetrap from 'react-hook-mousetrap';
import NumberEasing from 'react-number-easing';
import HypeGraph from './HypeGraph.js';

import { clamp, getCurrentDatapoint, fetcher } from './util.js';
import { getName } from './users.js';

export function Button(props) {
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

export default function Controls(props) {
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

	const username = useMemo(() => localStorage.getItem('username') || null, []);
	const password = useMemo(() => localStorage.getItem('password') || null, []);

	const [hypegraphUpdateTime, setHypegraphUpdateTime] = useState(() => Date.now());
	useEffect(() => setHypegraphUpdateTime(Date.now()), [props.fullscreen, props.sidebarOpen]);

	const datapoint = getCurrentDatapoint(props.video, props.progress);
	const viewcount = datapoint == null ? null : datapoint.viewcount;

	const [start, end] = props.region;
	const min = start / props.video.duration;
	const max = end / props.video.duration;

	const progressSecs = props.progress * props.video.duration;

	const { data } = swr(
		props.clip == null
			? `https://streams.lieuwe.xyz/api/stream/${props.video.id}/otherProgress`
			: null,
		fetcher,
		{
			refreshInterval: 5 * 1000, // 5 seconds
		},
	);
	const otherProgress = data || {};
	const markers = Object.entries(otherProgress).map(([uname, time]) => {
		if (uname === username) {
			return <></>;
		}

		const fract = time / props.video.duration;

		return <Tooltip title={getName(uname)} placement="top" arrow>
			<div
				className="progress-marker"
				style={{ 'left': `${100 * fract}%` }}
				onClick={() => props.onSeek(fract)}
			/>
		</Tooltip>;
	});

	return (
		<div className={`video-controls ${props.visible ? 'visible' : ''}`}>
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
				<Button onClick={() => props.onPlayChange(!props.playing)}>
					{ props.playing ? <Pause /> : <PlayArrow /> }
				</Button>

				<div className="slider-container">
					<HypeGraph
						video={props.video}
						region={props.region}
						smooth={(props.region[1] - props.region[0]) >= 30}
						updateTime={hypegraphUpdateTime} />
					{markers}
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

				<div className="volume-controls">
					<Button onClick={() => props.onMutedChange(!props.muted)}>
						{ props.muted ? <VolumeOff /> : <VolumeUp /> }
					</Button>
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

				{
					props.clip != null
					? <></>
					: <Button onClick={el => props.onTooltipClick('participants', el.currentTarget)}>
						<People />
					</Button>
				}
				{
					props.clip != null
					? <></>
					: <Button onClick={el => props.onTooltipClick('games', el.currentTarget)}>
						<SportsEsports />
					</Button>
				}
				{
					username == null || !(props.clip == null || props.clip.author_username === username)
					? <></>
					: <Button onClick={el => props.onTooltipClick('clipper', el.currentTarget)}>
						<MovieCreation />
					</Button>
				}
				{
					props.clip != null
					? <></>
					: <Button onClick={el => props.onTooltipClick('metadata', el.currentTarget)}>
						<Info />
					</Button>
				}

				<Button onClick={() => props.onFullscreenChange(!props.fullscreen)}>
					{ props.fullscreen ? <FullscreenExit /> : <Fullscreen /> }
				</Button>

				{
					!props.video.has_chat
						? <></>
						: <Button onClick={() => props.onSidebarChange(!props.sidebarOpen)}>
							{ props.sidebarOpen ? <ChevronRight /> : <ChevronLeft /> }
						</Button>
				}
			</div>
		</div>
	);
};
