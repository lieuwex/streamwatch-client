import { Link } from 'react-router-dom';
import React, { useState, useEffect } from 'react';
import filesize from 'filesize';
import formatDuration from 'format-duration';
import { isMobile } from 'react-device-detect';

import { formatGame, filterGames } from './util.js';
import './Videos.css';

function VideoPreview(props) {
	let videoContent = <></>;
	if (props.playPreview && props.video.has_preview && !isMobile) {
		const url = `/preview/${props.video.id}/preview.webm`;
		videoContent = (
			<video muted={true} loop={true} playsInline={true} preload="auto" autoPlay={true}>
				<source src={url} type="video/webm" />
			</video>
		);
	}

	let imageContent = <></>;
	if (props.video.thumbnail_count > 0) {
		imageContent
			= <img src={`/thumbnail/${props.video.id}/0.webp`} loading="lazy" />;
	}

	return (
		<div className="video-entry-preview">
			{videoContent}
			{imageContent}
		</div>
	)
}

function VideoInformation(props) {
	return (
		<div className="video-entry-information">
			<div className="video-entry-title">
				{props.video.file_name}
			</div>

			<div className="video-information-row">
				<div className="video-information-column">
					<div className="video-entry-information-entry">
						{filesize(props.video.file_size, {output: "array"}).join('')}
					</div>

					<div className="video-entry-information-entry">
						{formatDuration(1000 * props.video.duration)}
					</div>
				</div>

				<div className="video-information-column">
					<div className="video-entry-information-entry">
						{filterGames(props.video.games).map(formatGame).join(', ')}
					</div>

					<div className="video-entry-information-entry">
						{props.video.persons.map(g => g.name).join(', ')}
					</div>
				</div>
			</div>
		</div>
	);
}

function VideoThumbnails(props) {
	const thumbs = [];
	for (let i = 0; i < props.video.thumbnail_count; i++) {
		thumbs.push(<div className="video-entry-thumbnail" style={{backgroundImage: `url(/thumbnail/${props.video.id}/${i}.webp)`}} />);
	}

	return (
		<div className="video-entry-thumbnails">
			{thumbs}
		</div>
	);
}

function VideoProgress(props) {
	if (props.video.progress == null) {
		return <></>;
	}

	const progress = props.video.progress / props.video.duration;
	return <div className="video-entry-progress" style={{ width: `${progress * 100}%` }} />;
}

function Video(props) {
	const video = props.video;

	const [hovering, setHovering] = useState(false);

	const onEnter = () => setHovering(true);
	const onLeave = () => setHovering(false);

	return (
		<Link to={`/video/${video.id}`}>
			<div className="video-entry" onMouseEnter={onEnter} onMouseLeave={onLeave}>
				<VideoPreview video={video} playPreview={hovering} />
				<VideoInformation video={video} />
				{/* <div className="video-entry-blur"></div> */}
				{/* <VideoThumbnails video={video} /> */}
				<VideoProgress video={video} />
			</div>
		</Link>
	);
}

function Videos(props) {
	useEffect(() => {
		document.title = 'Streamwatch';
	}, []);

	const mapVideo = v => <Video key={v.id} video={v} />;
	const inProgress = props.videos.filter(v => v.inProgress).map(mapVideo);
	const items = props.videos.map(mapVideo);

	return (
		<div className="video-list-wrapper">
			<h1>Ga verder met kijken</h1>
			<div className="video-list in-progress">
				{inProgress}
			</div>

			<h1>Alle streams</h1>
			<div className="video-list">
				{items}
			</div>
		</div>
	);
}

export default Videos;
