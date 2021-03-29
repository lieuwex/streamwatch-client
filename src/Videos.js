import { Link } from 'react-router-dom';
import React, { useRef, useEffect } from 'react';
import filesize from 'filesize';
import formatDuration from 'format-duration';
import { isMobile } from 'react-device-detect';
import swr from 'swr';

import { fetcher } from './util.js';
import './Videos.css';

function VideoPreview(props) {
	const vidRef = useRef(null);
	useEffect(() => {
		if (!vidRef.current) {
			return;
		}

		vidRef.current.defaultMuted = true;
		vidRef.current.muted = true;
	}, [vidRef]);

	let videoContent = <></>;
	if (props.playPreview && props.video.has_preview && !isMobile) {
		const url = `/preview/${props.video.id}/preview.webm`;
		videoContent = (
			<video ref={vidRef} muted={true} loop={true} playsInline={true} preload="auto" autoPlay={true}>
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
						{props.video.games.map(g => g.name).join(', ')}
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
	const username = localStorage.getItem('username');
	const { data, error } = swr(username != null ? `/user/${username}/progress` : null, fetcher);

	if (error || !data) {
		return <></>;
	}

	let progress = data[props.video.id];
	if (progress == null) {
		return <></>;
	}
	progress /= props.video.duration;

	return <div className="video-entry-progress" style={{ width: `${progress * 100}%` }} />;
}

class Video extends React.Component {
	constructor(props) {
		super(props);

		this.state = { hovering: false };

		this.onEnter = this.onEnter.bind(this);
		this.onLeave = this.onLeave.bind(this);
	}

	onEnter() {
		this.setState({ hovering: true });
	}
	onLeave() {
		this.setState({ hovering: false });
	}

	render() {
		const content = [];
		content.push(<VideoPreview video={this.props.video} playPreview={this.state.hovering} />);
		content.push(<VideoInformation video={this.props.video} />);
		//content.push(<div className="video-entry-blur"></div>);
		//content.push(<VideoThumbnails video={this.props.video} />);
		content.push(<VideoProgress video={this.props.video} />);

		return (
			<Link to={`/video/${this.props.video.id}`} className="video-entry">
				<div className="video-entry" onMouseEnter={this.onEnter} onMouseLeave={this.onLeave}>
					{content}
				</div>
			</Link>
		);
	}
}

function Videos(props) {
	useEffect(() => {
		document.title = 'Streamwatch';
	});

	const items = props.videos.map(v => {
		return (
			<Video key={v.id} video={v} />
		);
	});

	return (
		<div className="video-list">
			{items}
		</div>
	);
}

export default Videos;
