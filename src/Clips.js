import { Link } from 'react-router-dom';
import React, { useState, useEffect } from 'react';
import formatDuration from 'format-duration';
import { isMobile } from 'react-device-detect';
import { DateTime } from 'luxon';

import { formatDate, plural, isChromeLike } from './util.js';
import { VideosList } from './Videos.js';
import useStreams from './streamsHook.js';
import Loading from './Loading.js';
import { getName } from './users.js';

function ClipPreview(props) {
	let videoContent = <></>;
	if (props.playPreview && !isMobile) {
		const url = `http://local.lieuwe.xyz:6070/preview/clips/${props.clip.id}.webm`;
		videoContent = (
			<video muted={true} loop={true} playsInline={true} preload="auto" autoPlay={true}>
				<source src={url} type="video/webm" />
			</video>
		);
	}

	let imageContent
		= <img src={`http://local.lieuwe.xyz:6070/thumbnail/clips/${props.clip.id}.webp`} loading="lazy" alt="" />;

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

			<div className="video-entry-progress" style={{ width: `${props.clip.watched * 100}%` }} />
		</div>
	);
}

export function ClipVideo(props) {
	const video = props.video;
	const clip = props.clip;

	const [hovering, setHovering] = useState(false);

	const onEnter = () => setHovering(true);
	const onLeave = () => setHovering(false);

	return (
		<div className="video-flipper">
			<Link to={`/clip/${clip.id}`} className="video-entry" onMouseEnter={onEnter} onMouseLeave={onLeave}>
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

	const { isLoading, streams: streamsInfo, clips: clipsInfo } = useStreams();
	const videos = streamsInfo[0];

	if (isLoading) {
		return <Loading heavyLoad={true} />;
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
				: <VideosList header="Clips">
					{clips}
				</VideosList>
			}
		</div>
	);
}
