import { Link } from 'react-router-dom';
import React, { useRef, useEffect } from 'react';
import filesize from 'filesize';
import formatDuration from 'format-duration';
import Observer from '@researchgate/react-intersection-observer';
import { isMobile } from 'react-device-detect';

import './Videos.css';

function VideoPreview(props) {
	const vidRef = useRef(null);
	props.setPlaying.videoElement = vidRef;

	const thumbRef = useRef(null);
	props.setPlaying.thumbnailElement = thumbRef;

	useEffect(() => {
		if (!vidRef.current) {
			return;
		}

		vidRef.current.defaultMuted = true;
		vidRef.current.muted = true;
	}, []);

	let videoContent = <></>;
	if (props.visible && props.video.has_preview && !isMobile) {
		const url = `/preview/${props.video.id}/preview.webm`;
		videoContent = (
			<video ref={vidRef} muted={true} loop={true} playsInline={true} preload="auto">
				<source src={url} type="video/webm" />
			</video>
		);
	}

	let imageContent = <></>;
	if (props.video.thumbnail_count > 0) {
		imageContent
			= <img ref={thumbRef} src={`/thumbnail/${props.video.id}/0.webp`} loading="lazy" />;
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
	return <></>;

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
	const progress = localStorage.getItem(`progress_${props.video.id}`) || 0;
	return <div className="video-entry-progress" style={{ width: `${progress * 100}%` }} />;
}

class Video extends React.Component {
	constructor(props) {
		super(props);

		this.state = { isVisible: false };

		this.setPlaying = function (playing) {
			const videoEl = this.setPlaying.videoElement.current;
			if (videoEl == null) {
				return;
			}
			const thumbnailEl = this.setPlaying.thumbnailElement.current;
			if (thumbnailEl == null) {
				return;
			}

			if (playing) {
				videoEl.style.opacity = '1';
				thumbnailEl.style.opacity = '0';

				videoEl.play();
			} else {
				videoEl.style.opacity = '0';
				thumbnailEl.style.opacity = '1';

				videoEl.pause();
				videoEl.currentTime = 0;
			}
		};

		this.onEnter = this.onEnter.bind(this);
		this.onLeave = this.onLeave.bind(this);
		this.onChange = this.onChange.bind(this);
	}

	onEnter() {
		this.setPlaying(true);
	}
	onLeave() {
		this.setPlaying(false);
	}

	onChange(event) {
		this.setState({ isVisible: event.isIntersecting });
	}

	render() {
		const content = [];
		content.push(<VideoPreview video={this.props.video} setPlaying={this.setPlaying} visible={this.state.isVisible} />);
		content.push(<VideoInformation video={this.props.video} />);
		if (this.state.isVisible) {
			//content.push(<div className="video-entry-blur"></div>);
			content.push(<VideoThumbnails video={this.props.video} />);
			content.push(<VideoProgress video={this.props.video} />);
		}

		return (
			<Observer onChange={this.onChange}>
				<Link to={`/video/${this.props.video.id}`} className="video-entry">
					<div className="video-entry" onMouseEnter={this.onEnter} onMouseLeave={this.onLeave}>
						{content}
					</div>
				</Link>
			</Observer>
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
