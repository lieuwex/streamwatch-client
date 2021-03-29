import { withRouter } from 'react-router-dom';
import ReactPlayer from 'react-player';
import React, { useState } from 'react';
import { isChrome, isChromium, isEdgeChromium } from 'react-device-detect';
import chroma from 'chroma-js';
import formatDuration from 'format-duration';
import Tooltip from '@material-ui/core/Tooltip';

import './Player.css';
import ChatManager from './ChatManager.js';
import { formatTime, updateStreamsProgress, fetcher } from './util.js';

import tlds from 'tlds';
import makeLinkify from 'linkify-it';

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

const Video = React.memo(props => {
	const url = `/stream/${props.video.file_name}`;

	const ref = player => {
		props.setRef(player);
	};

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
});

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
	let { id } = props.match.params;
	const video = props.videos.find(v => v.id == id);

	const [volume, setVolume] = useState(localStorage.getItem('volume') || 1);
	const [progress, setProgress] = useState(TODO);
	const [playing, setPlaying] = useState(true);
	const [sidebarOpen, setSidebarOpen] = useState(video.has_chat);

	useEffect(() => {
		const intervalId = setInterval(() => {
			(async () => {
				if (!this.state.playing) {
					return;
				}

				const username = localStorage.getItem('username');
				const dict = await fetcher(`/user/${username}/progress`);

				dict[this.state.video.id] = this.state.progress * video.duration;
				await updateStreamsProgress(dict);
			})().catch(e => console.error(e));
		}, 5000);

		return () => {
			clearInterval(intervalId);
		};
	}, []);
}

class Player extends React.Component {
	constructor(props) {
		super(props);

		let { id } = props.match.params;
		const video = props.videos.find(v => v.id == id);

		this.state = {
			volume: localStorage.getItem('volume') || 1,
			progress: localStorage.getItem(`progress_${id}`) || 0,
			playing: true,
			video: video,
			sidebarOpen: video.has_chat,
		};

		this.intervalId = setInterval(() => {
			(async () => {
				if (!this.state.playing) {
					return;
				}

				const username = localStorage.getItem('username');
				const dict = await fetcher(`/user/${username}/progress`);

				dict[this.state.video.id] = this.state.progress * video.duration;
				await updateStreamsProgress(dict);
			})().catch(e => console.error(e));
		}, 5000);

		this.ref = this.ref.bind(this);
		this.onStart = this.onStart.bind(this);
		this.onProgress = this.onProgress.bind(this);
		this.onPause = this.onPause.bind(this);
		this.onPlay = this.onPlay.bind(this);
	}

	componentDidMount() {
		document.title = `${this.state.video.file_name} - Streamwatch`;
	}

	componentWillUnmount() {
		clearInterval(this.intervalId);
	}

	ref(player) {
		this.player = player;
	}

	onStart() {
		this.player.seekTo(this.state.progress, 'fraction');
	}

	onProgress({ played }) {
		this.setState({
			progress: played,
		});
	}

	onPause() {
		this.setState({
			playing: false,
		});
	}

	onPlay() {
		this.setState({
			playing: true,
		});
	}

	render() {
		if (this.state.video == null) {
			return (
				<div>video not found</div>
			);
		}

		return (
			<div class="player">
				<div class="player-wrapper">
					<PauseShade video={this.state.video} visible={!this.state.playing} />
					<Video
						video={this.state.video}
						volume={this.state.volume}
						setRef={this.ref}
						onStart={this.onStart}
						onProgress={this.onProgress}
						onPause={this.onPause}
						onPlay={this.onPlay} />
				</div>
				{ this.state.sidebarOpen ? <Sidebar video={this.state.video} progress={this.state.progress} playing={this.state.playing} /> : <></> }
			</div>
		);
	}
}

export default withRouter(Player);
