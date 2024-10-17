import { Navigate, Link } from 'react-router-dom';
import React, { useState, useEffect, startTransition } from 'react';
import formatDuration from 'format-duration';
import { isMobile } from 'react-device-detect';
import { Flipper, Flipped } from 'react-flip-toolkit';
import Backdrop from '@mui/material/Backdrop';
import { PlayArrow, Search } from '@mui/icons-material';
import mousetrap from 'mousetrap';
import { filesize } from 'filesize';
import swr from 'swr';

import { formatGame, filterGames, formatDate, getTitle, isChromeLike, fetcher, useRequireLogin } from './util.js';
import './Videos.css';
import { ClipVideo } from './Clips';
import useStreams from './streamsHook.js';
import Loading from './Loading';
import { ProcessingVideo } from './Processing';

function VideoPreview(props) {
	let videoContent = <></>;
	if (props.playPreview && props.video.has_preview && !isMobile) {
		const url = `https://streams.lieuwe.xyz/preview/${props.video.id}.webm`;
		videoContent = (
			<video muted={true} loop={true} playsInline={true} preload="auto" autoPlay={true}>
				<source src={url} type="video/webm" />
			</video>
		);
	}

	let imageContent = <></>;
	if (props.video.thumbnail_count > 0) {
		imageContent
			= <img src={`https://streams.lieuwe.xyz/thumbnail/${props.video.id}/0.webp`} loading="lazy" alt="" />;
	}

	return (
		<div className="video-entry-preview">
			{videoContent}
			{imageContent}
		</div>
	)
}

function VideoInformation(props) {
	const [title, hasNiceTitle] = getTitle(props.video, true);

	//const [title, hasNiceTitle] = getTitle(props.video, true);
	const isLong = title.length > 33;
	const pixels = Math.max(Math.min(750 / title.length, 40), 25);

	return (
		<div className={`video-entry-information ${props.fullInfo ? 'expanded' : ''}`}>
			<div className={`video-entry-title ${isLong ? 'long' : ''} ${isChromeLike() ? 'clip' : ''}`} style={{ fontSize: `${pixels}px` }}>
				{title}
			</div>
			{
				!hasNiceTitle
				? <></>
				: <div className="video-entry-date">
					{formatDate(props.video.date)}
				</div>
			}

			{
				!props.fullInfo
				? <></>
				: <div className="video-entry-size">
					{filesize(props.video.file_size, {output: "array"}).join('')}
				</div>
			}

			{
				!props.fullInfo || !props.video.addedDate
				? <></>
				: <div className="video-entry-addeddate">
					{formatDate(props.video.addedDate)}
				</div>
			}

			<div className="video-entry-duration">
				{formatDuration(1000 * props.video.duration)}
			</div>

			<div className="video-entry-games">
				{filterGames(props.video.games).map(formatGame).join(', ')}
			</div>

			<div className="video-entry-persons">
				{props.video.persons.map(g => g.name).join(', ')}
			</div>

			{
				props.fullInfo
				? <></>
				: <VideoProgress video={props.video} />
			}
		</div>
	);
}

function VideoProgress(props) {
	if (props.video.progress == null) {
		return <></>;
	}

	const progress = props.video.progress.time / props.video.duration;
	return <div className="video-entry-progress" style={{ width: `${progress * 100}%` }} />;
}

function Video(props) {
	const video = props.video;

	const [hovering, setHovering] = useState(false);
	const [clicked, setClicked] = useState(false);
	const [animating, setAnimating] = useState(false);
	const [redirect, setRedirect] = useState(false);

	useEffect(() => {
		if (!clicked) {
			return;
		}

		mousetrap.bind('esc', () => setClicked(false));
		return () => mousetrap.unbind('esc');
	}, [clicked]);

	const onEnter = () => setHovering(true);
	const onLeave = () => setHovering(false);
	const onClick = e => {
		if (isMobile) {
			return;
		}

		e.preventDefault();

		if (!clicked) {
			setClicked(true);
		} else {
			setRedirect(true);
		}
	}

	const content = (
		<Link to={`/video/${video.id}`} onClick={onClick} className={`video-entry ${clicked ? 'clicked' : ''} ${animating ? 'animating' : ''}`} onMouseEnter={onEnter} onMouseLeave={onLeave}>
			<VideoPreview video={video} playPreview={hovering || clicked} />
			<VideoInformation video={video} fullInfo={clicked} />
			{
				!clicked
				? <></>
				: <PlayArrow />
			}
		</Link>
	);

	if (isMobile) {
		return (
			<div className="video-flipper">
				{content}
			</div>
		);
	}

	return (
		<>
			{ redirect ? <Navigate push to={`/video/${video.id}`} /> : <></> }
			<Flipper flipKey={clicked} className="video-flipper">
				<Flipped flipId={`video-${video.id}`} onStart={() => setAnimating(true)} onComplete={() => setAnimating(false)}>
					{content}
				</Flipped>
			</Flipper>
			{
				(hovering || clicked || animating)
				? <Backdrop open={clicked} onClick={() => setClicked(false)} transitionDuration={300} sx={{ zIndex: '30' }} />
				: <></>
			}
		</>
	);
}

function VideoListSearch(props) {
	return <div className="search">
		<Search className="icon" />
		<input type="text" spellCheck={false} onChange={e => props.onChange?.(e.target.value)} />
	</div>;
}

function useLimit(name, limiting) {
	const INITIAL_LIMIT = 100;

	const key = `lastLimit_'${name}'`;

	const [limit, setLimit] = useState(() => {
		if (!limiting) {
			return null;
		}

		const val = sessionStorage.getItem(key);
		return val == null ? INITIAL_LIMIT : JSON.parse(val);
	});

	useEffect(() => {
		console.log('setting sessionStorage', key, JSON.stringify(limit));
		sessionStorage.setItem(key, JSON.stringify(limit));
	}, [limit]);

	const resetLimit = () => setLimit(INITIAL_LIMIT);

	return [limit, setLimit, resetLimit];
}

export function VideosList(props) {
	const [query, setQuery] = useState('');
	const [limit, setLimit, resetLimit] = useLimit(props.header, props.limiting);

	const matches = props => {
		const video = props.video;
		const clip = props.clip;

		const q = query.toLowerCase().trim();
		if (q == '') {
			return true;
		}

		if (video == null) {
			return false;
		}

		const t = s => s?.toLowerCase()?.includes(q);

		const videoMatch
			 = filterGames(video.games).some(g => t(g.name) || t(q.twitch_name))
			|| t(video.title)
			|| t(video.file_name);

		let clipMatch = false;
		if (clip != null) {
			clipMatch = t(clip.author_username) || t(clip.title);
		}

		return videoMatch || clipMatch
	};

	const filtered = props.children.filter(e => matches(e.props));
	const limited = limit ? filtered.slice(0, limit) : filtered;

	const moreToShow = filtered.length > limited.length;

	const onChange = q => {
		startTransition(() => {
			setQuery(q);
			resetLimit();
		});
	};

	return <>
		<h1 className={`${props.search ? 'with-search' : ''}`}>
			{ props.search ? <VideoListSearch onChange={onChange} /> : <></> }
			{props.header} {props.search ? `(${filtered.length})` : ''}
			{props.button || <></>}
		</h1>
		<div className={`video-list ${props.horizontal ? 'horizontal' : ''}`}>
			{limited}
		</div>
		{
			!moreToShow
			? <></>
			: <button onClick={() => setLimit(null)} className='showall'>Laat alles zien</button>
		}
	</>;
}

export default function Videos() {
	useEffect(() => {
		document.title = 'Streamwatch';
	}, []);
	useRequireLogin();

	let { isLoading, streams: streamsInfo, clips: clipsInfo } = useStreams();
	const videos = streamsInfo[0];

	let { data: processingData, error: processingError } = swr(
		'https://streams.lieuwe.xyz/api/processing',
		fetcher,
		{
			refreshInterval: 2 * 60 * 1000, // 2 minutes
		},
	);
	isLoading = isLoading || (processingData == null && processingError == null);

	if (isLoading) {
		return <Loading />;
	}

	const mapVideo = v => <Video key={v.id} video={v} />;
	const inProgress = videos
		.filter(v => v.inProgress)
		.sort((a, b) => {
			return b.progress.real_time - a.progress.real_time;
		})
		.map(mapVideo);
	const items = videos.map(mapVideo);

	// TODO: ordering
	for (const item of processingData) {
		const el = <ProcessingVideo key={`p_${item.id}`} info={item} />;
		items.unshift(el);
	}

	const mapClip = (c, v) => <ClipVideo key={c.id} video={v} clip={c} />;
	const clips = clipsInfo[0].slice(-10).map(clip => {
		const video = videos.find(v => v.id === clip.stream_id);
		return mapClip(clip, video);
	}).reverse();

	return (
		<div className="video-list-wrapper">
			{
				inProgress.length === 0
				? <></>
				: <VideosList header="Ga verder met kijken" horizontal={true}>
					{inProgress}
				</VideosList>
			}

			{
				clips.length === 0
				? <></>
				: <VideosList header="Recente clips" horizontal={true} button={
					<Link to="/clips">
						<button className='header-button'>Alle clips &rarr;</button>
					</Link>
				}>
					{clips}
				</VideosList>
			}

			<VideosList search={true} header="Alle streams" limiting={true} >
				{items}
			</VideosList>
		</div>
	);
}
