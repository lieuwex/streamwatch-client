import { Link } from 'react-router-dom';
import React, { useState, useEffect } from 'react';
import formatDuration from 'format-duration';
import { isMobile } from 'react-device-detect';
import { DateTime } from 'luxon';

import './Clips.css';
import { formatDate, plural, isChromeLike, useRequireLogin } from './util.js';
import { VideosList } from './Videos';
import useStreams from './streamsHook.js';
import Loading from './Loading';
import { getName } from './users.js';

function ClipPreview(props) {
	let videoContent = <></>;
	if (props.playPreview && !isMobile) {
		const url = `https://streams.lieuwe.xyz/preview/clips/${props.clip.id}.webm`;
		videoContent = (
			<video muted={true} loop={true} playsInline={true} preload="auto" autoPlay={true}>
				<source src={url} type="video/webm" />
			</video>
		);
	}

	let imageContent
		= <img src={`https://streams.lieuwe.xyz/thumbnail/clips/${props.clip.id}.webp`} loading="lazy" alt="" />;

	return (
		<div className="video-entry-preview">
			{videoContent}
			{imageContent}
		</div>
	)
}

function ClipInformation(props) {
	const title = props.clip.title;

	const isLong = title.length > 33;
	const pixels = Math.max(Math.min(750 / title.length, 40), 25);

	const username = localStorage.getItem('username');
	const watched = props.clip.watched || props.clip.author_username === username;

	return (
		<div className="video-entry-information">
			<div className={`video-entry-title ${isLong ? 'long' : ''} ${isChromeLike() ? 'clip' : ''}`} style={{ fontSize: `${pixels}px` }}>
				{title}
			</div>

			<div className="video-entry-date">
				{formatDate(DateTime.fromSeconds(props.clip.created_at))}
			</div>

			<div className="video-entry-duration">
				{formatDuration(1000 * props.clip.duration)}
			</div>

			<div className="video-entry-games">
				{getName(props.clip.author_username)}
			</div>

			<div className="video-entry-persons">
				{props.clip.view_count} {plural(props.clip.view_count, "view", "views")}
			</div>

			<div className="video-entry-progress" style={{ width: `${watched * 100}%` }} />
		</div>
	);
}

export function ClipVideo(props) {
	const video = props.video;
	const clip = props.clip;

	const safe = clip.safe_to_watch;

	const [hovering, setHovering] = useState(false);

	const onEnter = () => setHovering(true);
	const onLeave = () => setHovering(false);

	return (
		<div className="video-flipper">
			<Link to={`/clip/${clip.id}`} className={`video-entry clip ${safe ? 'safe' : ''}`} onMouseEnter={onEnter} onMouseLeave={onLeave}>
				<ClipPreview clip={clip} playPreview={hovering} />
				<ClipInformation video={video} clip={clip} fullInfo={false} />
			</Link>
		</div>
	);
}

export default function Clips() {
	useEffect(() => {
		document.title = 'Streamwatch - Clips';
	}, []);
	useRequireLogin();

	const { isLoading, streams: streamsInfo, clips: clipsInfo } = useStreams();
	const videos = streamsInfo[0];

	if (isLoading) {
		return <Loading />;
	}

	const mapClip = (c, v) => <ClipVideo key={c.id} video={v} clip={c} />;
	const clips = clipsInfo[0].map(clip => {
		const video = videos.find(v => v.id === clip.stream_id);
		return mapClip(clip, video);
	}).reverse();

	return (
		<div className="video-list-wrapper">
			{
				clips.length === 0
				? <></>
				: <VideosList header="Clips" search={true} limiting={true} >
					{clips}
				</VideosList>
			}
		</div>
	);
}
