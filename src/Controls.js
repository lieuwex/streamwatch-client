import { Slider, IconButton } from '@mui/material';
import { Pause, MovieCreation, PlayArrow, VolumeUp, VolumeOff, FullscreenExit, Fullscreen, People, SportsEsports, ChevronLeft, ChevronRight, Info } from '@mui/icons-material';
import formatDuration from 'format-duration';
import useMousetrap from 'react-hook-mousetrap';
import NumberEasing from 'react-number-easing';
import HypeGraph from './HypeGraph.js';

import { clamp, getCurrentDatapoint } from './util.js';

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

	const datapoint = getCurrentDatapoint(props.video, props.progress);
	const viewcount = datapoint == null ? null : datapoint.viewcount;

	return (
		<div className={`video-controls ${props.visible ? 'visible' : ''}`}>
			<div className="controls-row information">
				<div className="duration fixed-width-num">
					{formatDuration(1000 * props.progress * props.video.duration)} / {formatDuration(1000 * props.video.duration)}
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
					<HypeGraph streamId={props.video.id} />
					<Slider value={props.progress} max={1} step={0.001} onChange={(_, newValue) => props.onSeek(newValue)} />
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

				<Button onClick={el => props.onTooltipClick('participants', el.currentTarget)}>
					<People />
				</Button>

				<Button onClick={el => props.onTooltipClick('games', el.currentTarget)}>
					<SportsEsports />
				</Button>

				<Button onClick={el => props.onTooltipClick('clipper', el.currentTarget)}>
					<MovieCreation />
				</Button>

				<Button onClick={el => props.onTooltipClick('metadata', el.currentTarget)}>
					<Info />
				</Button>

				<Button onClick={() => props.onFullscreenChange(!props.fullscreen)}>
					{ props.fullscreen ? <FullscreenExit /> : <Fullscreen /> }
				</Button>

				<Button onClick={() => props.onSidebarChange(!props.sidebarOpen)}>
					{ props.sidebarOpen ? <ChevronRight /> : <ChevronLeft /> }
				</Button>
			</div>
		</div>
	);
};
