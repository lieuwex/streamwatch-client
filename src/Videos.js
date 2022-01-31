import { Navigate, Link } from 'react-router-dom';
import React, { useState, useEffect } from 'react';
import formatDuration from 'format-duration';
import { isMobile } from 'react-device-detect';
import { Flipper, Flipped } from 'react-flip-toolkit';
import Backdrop from '@mui/material/Backdrop';
import { PlayArrow } from '@mui/icons-material';
import mousetrap from 'mousetrap';
import filesize from 'filesize';

import { formatGame, filterGames, formatDate, getTitle } from './util.js';
import './Videos.css';

function VideoPreview(props) {
	let videoContent = <></>;
	if (props.playPreview && props.video.has_preview && !isMobile) {
		const url = `http://local.lieuwe.xyz:6070/preview/${props.video.id}.webm`;
		videoContent = (
			<video muted={true} loop={true} playsInline={true} preload="auto" autoPlay={true}>
				<source src={url} type="video/webm" />
			</video>
		);
	}

	let imageContent = <></>;
	if (props.video.thumbnail_count > 0) {
		imageContent
			= <img src={`http://local.lieuwe.xyz:6070/thumbnail/${props.video.id}/0.webp`} loading="lazy" alt="" />;
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
	const isLong = title.length > 33;
	const pixels = Math.max(Math.min(750 / title.length, 40), 25);

	return (
		<div className="video-entry-information">
			<div className={`video-entry-title ${isLong ? 'long' : ''}`} style={{ fontSize: `${pixels}px` }}>
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

			<div className="video-entry-duration">
				{formatDuration(1000 * props.video.duration)}
			</div>

			<div className="video-entry-games">
				{filterGames(props.video.games).map(formatGame).join(', ')}
			</div>

			<div className="video-entry-persons">
				{props.video.persons.map(g => g.name).join(', ')}
			</div>

			<VideoProgress video={props.video} />
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

function VideosList(props) {
	return <>
		<h1>{props.header}</h1>
		<div className={`video-list ${props.inProgress ? 'in-progress' : ''}`}>
			{props.children}
		</div>
	</>;
}

function Videos(props) {
	useEffect(() => {
		document.title = 'Streamwatch';
	}, []);

	const mapVideo = v => <Video key={v.id} video={v} />;
	const inProgress = [...props.videos]
		.filter(v => v.inProgress)
		.sort((a, b) => {
			return b.progress.real_time - a.progress.real_time;
		})
		.map(mapVideo);
	const items = props.videos.map(mapVideo);

	return (
		<div className="video-list-wrapper">
			{
				inProgress.length === 0
				? <></>
				: <VideosList header="Ga verder met kijken" inProgress={true}>
					{inProgress}
				</VideosList>
			}

			<VideosList header="Alle streams" inProgress={false}>
				{items}
			</VideosList>
		</div>
	);
}

export default Videos;
