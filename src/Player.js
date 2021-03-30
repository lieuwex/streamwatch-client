import { useParams } from 'react-router-dom';
import ReactPlayer from 'react-player';
import React, { useState, useRef, useEffect } from 'react';
import { isChrome, isChromium, isEdgeChromium } from 'react-device-detect';
import chroma from 'chroma-js';
import formatDuration from 'format-duration';
import Tooltip from '@material-ui/core/Tooltip';

import './Player.css';
import ChatManager from './ChatManager.js';
import { formatTime, updateStreamsProgress, fetcher } from './util.js';

import tlds from 'tlds';
import makeLinkify from 'linkify-it';
import Loading from './Loading';

const linkify = makeLinkify();
linkify.tlds(tlds);

function convertUrls(str) {
	const matches = linkify.match(str);
	const res = [];
	let last = 0;

	for (const match of (matches || [])) {
		if (last < match.index) {
			res.push(str.slice(last, match.index));
		}
		res.push(`<a target='_blank' href='${match.url}'>${match.text}</a>`);
		last = match.lastIndex;
	}

	if (last < str.length) {
		res.push(str.slice(last));
	}

	return res.join('');
}

const Video = React.memo(React.forwardRef((props, ref) => {
	const url = `/stream/${props.video.file_name}`;

	return <ReactPlayer
		url={url}
		width="100%"
		height="100%"
		playing={true}
		controls={true}
		volume={props.volume}
		ref={ref}
		onStart={props.onStart}
		onProgress={props.onProgress}
		onPause={props.onPause}
		onPlay={props.onPlay}
		progressInterval={250}
	/>;
}));

const ChatMessage = React.memo(props => {
	let body = convertUrls(props.message.message);
	body = window.twitchParser.parse(body);

	let color;
	let fontColor;
	if (props.message.tags.color) {
		color = chroma(props.message.tags.color).darken(2).saturate(2).hex();
		fontColor = chroma(color).luminance() > .45 ? 'black' : 'white';
	} else {
		color = '#383838';
		fontColor = 'white';
	}

	const action = ({
		'resub': 'resubscribed',
		'subscription': 'subscribed',
		'subgift': `gifted ${+props.message.tags['msg-param-sender-count'] || 1} sub(s)`,
	})[props.message.type];

	const isVip = [
		"lieuwex",
		"genotsknots",
		"lekkerspelen",
	].includes(props.message.tags['display-name'].toLowerCase());

	return (
		<div className={`chat-message ${props.message.type} ${isVip ? 'vip' : ''}`}>
			<Tooltip title={formatTime(new Date(props.message.ts))}>
				<div className="message-timestamp">{formatDuration(props.message.ts - props.videoTimestamp)}</div>
			</Tooltip>
			<div className="message-author" style={{ backgroundColor: color, color: fontColor }}>{props.message.tags['display-name']}</div>
			{action != null ? <div className="message-action">{action}</div> : <></>}
			<div className="message-content" dangerouslySetInnerHTML={{__html: body}} />
		</div>
	);
});

class Chat extends React.Component {
	constructor(props) {
		super(props);

		const manager = new ChatManager(props.video);
		this.state = { messages: [], manager };

		this.chatRef = React.createRef();
	}

	shouldComponentUpdate(nextProps) {
		if (nextProps.sticky !== this.props.sticky) {
			return true;
		}

		const dist = Math.abs(nextProps.offset - this.props.offset);
		return dist > 150;
	}

	componentWillUpdate() {
		const dist = Math.abs(this.props.offset - this.state.previousOffset);
		if (dist >= 3000) {
			// if more than 3 seconds, clear all messages from the manager
			this.state.manager.clear();
		}

		const currTimestamp = this.props.offset + this.props.video.timestamp;
		//console.log('currTimestamp', currTimestamp);

		// ensure that we have enough data for now and the future, does not
		// block.
		this.state.manager.ensureData(currTimestamp);

		// get all messages from the start till now.
		let messages = this.state.manager.getBetween(0, currTimestamp);
		// limit the amount of messages rendered to 300.
		messages = messages.slice(Math.max(0, messages.length - 300), messages.length);

		this.setState({
			messages,
			previousOffset: this.props.offset,
		});
	}

	componentDidUpdate() {
		if (isChrome || isChromium || isEdgeChromium) {
			return;
		} else if (this.chatRef.current == null) {
			return;
		}

		const el = this.chatRef.current;
		el.scrollTo(0, el.scrollHeight);
	}

	componentWillUnmount() {
		this.state.manager.close();
	}

	render() {
		const items = this.state.messages.map(m => {
			return <ChatMessage key={m.tags.id} message={m} videoTimestamp={this.props.video.timestamp} />;
		});

		return (
			<div className={`sidebar-chat ${this.props.sticky ? 'sticky' : ''}`} ref={this.chatRef}>
				{items}
			</div>
		);
	}
}

function Sidebar(props) {
	const offset = Math.floor(props.video.duration * props.progress * 1000);

	return (
		<div className="sidebar">
			<Chat video={props.video} offset={offset} sticky={props.playing} />
		</div>
	);
}

function PauseShade(props) {
	return (
		<div className={`pause-shade ${props.visible ? 'visible' : ''}`}>
			{props.video.file_name}
		</div>
	);
}

function Player(props) {
	const video = props.video;

	const [volume, setVolume] = useState(localStorage.getItem('volume') || 1);
	const [progress, setProgress] = useState(props.initialProgress);
	const [playing, setPlaying] = useState(true);
	const [sidebarOpen, setSidebarOpen] = useState(video.has_chat);

	const [previousUpdateAt, setPreviousUpdateAt] = useState(props.initialProgress);

	useEffect(() => {
		document.title = `${video.file_name} - Streamwatch`;
	}, [video.file_name]);

	useEffect(() => {
		if (Math.abs(progress - previousUpdateAt) < 5) {
			return;
		}

		setPreviousUpdateAt(progress);

		requestIdleCallback(() => {
			(async () => {
				if (!playing) {
					return;
				}

				const username = localStorage.getItem('username');
				const dict = await fetcher(`/user/${username}/progress`);

				dict[video.id] = progress;
				await updateStreamsProgress(dict);
			})().catch(e => console.error(e));
		});
	}, [progress]);

	const playerRef = useRef(null);
	const onStart = () => {
		console.log('playerRef', playerRef.current);

		if (playerRef.current == null) {
			return;
		}

		playerRef.current.seekTo(props.initialProgress, 'seconds');
	};

	return (
		<div class="player">
			<div class="player-wrapper">
				<PauseShade video={video} visible={!playing} />
				<Video
					video={video}
					volume={volume}
					ref={playerRef}
					onStart={onStart}
					onProgress={({ playedSeconds }) => setProgress(playedSeconds)}
					onPause={() => setPlaying(false)}
					onPlay={() => setPlaying(true)} />
			</div>
			{ sidebarOpen ? <Sidebar video={video} progress={progress} playing={playing} /> : <></> }
		</div>
	);
}

export default function PlayerWrapper(props) {
	const { id } = useParams();
	const video = props.videos.find(v => v.id == id);

	const [initialProgress, setInitialProgress] = useState(null);

	useEffect(() => {
		const username = localStorage.getItem('username');
		if (username == null || video == null) {
			setInitialProgress(0);
		} else {
			fetcher(`/user/${username}/progress`).then(r => setInitialProgress(r[video.id]));
		}
	}, [video]);

	if (video == null) {
		return <div>video not found</div>;
	} else if (initialProgress == null) {
		return <Loading />;
	}

	return <Player video={video} initialProgress={initialProgress} />;
}
