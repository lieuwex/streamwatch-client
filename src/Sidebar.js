import React from 'react';
import { isChrome, isChromium, isEdgeChromium } from 'react-device-detect';
import chroma from 'chroma-js';
import formatDuration from 'format-duration';
import { Tooltip } from '@material-ui/core';
import { DataUsage } from '@material-ui/icons';
import tlds from 'tlds';
import makeLinkify from 'linkify-it';
import { encode } from 'he';

import './Sidebar.css';
import { formatTime } from './util.js';
import ChatManager from './ChatManager.js';

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

const ChatMessage = React.memo(props => {
	let body = encode(props.message.message);
	body = convertUrls(body);
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
		'sub': 'subscribed',
		'subscription': 'subscribed',
		'subgift': `gifted ${+props.message.tags['msg-param-sender-count'] || 1} sub(s)`,
	})[props.message.type];

	const isVip = [
		"lieuwex",
		"genotsknots",
		"lekkerspelen",
	].includes(props.message.tags['display-name'].toLowerCase());

	const prediction = props.message.tags.badges.predictions;
	const predictionColor = prediction && chroma(prediction.slice(0, prediction.length-2)).saturate(10).brighten().hex();
	const predictionText = props.message.tags['badge-info'].predictions || null;

	return (
		<div className={`chat-message ${props.message.type} ${isVip ? 'vip' : ''}`}>
			<Tooltip title={formatTime(new Date(props.message.ts))} placement="left">
				<div className="message-timestamp">{formatDuration(props.message.ts - props.videoTimestamp)}</div>
			</Tooltip>
				{
					prediction == null
					? <></>
					: <div className="message-icon prediction" style={{ color: predictionColor }}>
						<Tooltip title={predictionText} placement="bottom">
							<DataUsage />
						</Tooltip>
					</div>
				}
			<div className="message-author" style={{ backgroundColor: color, color: fontColor }}>{props.message.tags['display-name']}</div>
			{action != null ? <div className="message-action">{action}</div> : <></>}
			<div className="message-content" dangerouslySetInnerHTML={{__html: body}} />
		</div>
	);
});

/*
const Chat = React.memo(props => {
	const manager = useRef(null);
	useEffect(() => {
		manager.current = new ChatManager(props.video);

		return () => manager.current.close();
	}, []);

	const previousOffset = useRef(null);
	const [messages, setMessages] = useState([]);

	useEffect(() => {
		const dist = Math.abs(props.offset - previousOffset.current);
		if (dist >= 3000) {
			// if more than 3 seconds, clear all messages from the manager
			manager.current.clear();
		}

		const currTimestamp = props.offset + props.video.timestamp;
		//console.log('currTimestamp', currTimestamp);

		// ensure that we have enough data for now and the future, does not
		// block.
		manager.current.ensureData(currTimestamp);

		// get all messages from the start till now.
		let newMessages = manager.current.getBetween(0, currTimestamp);
		// limit the amount of messages rendered to 300.
		newMessages = newMessages.slice(Math.max(0, newMessages.length - 300), newMessages.length);

		setMessages(newMessages);
	}, [props.offset]);

	const chatRef = useRef(null);
	useEffect(() => {
		if (isChrome || isChromium || isEdgeChromium) {
			return;
		} else if (chatRef.current == null) {
			return;
		}

		const el = chatRef.current;
		el.scrollTo(0, el.scrollHeight);
	}, [messages]);

	return (
		<div className={`sidebar-chat ${props.sticky ? 'sticky' : ''}`} ref={chatRef}>
			{messages.map(m =>
				<ChatMessage key={m.tags.id} message={m} videoTimestamp={props.video.timestamp} />
			)}
		</div>
	);
}, (prevProps, nextProps) => {
	if (nextProps.sticky !== prevProps.sticky) {
		return false;
	}

	const dist = Math.abs(nextProps.offset - prevProps.offset);
	return dist <= 150;
});
*/

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

	componentDidUpdate() {
		const dist = Math.abs(this.props.offset - this.state.previousOffset);
		if (dist >= 3000) {
			// if more than 3 seconds, clear all messages from the manager
			this.state.manager.clear();
		}

		let currTimestamp = this.props.offset + this.props.video.timestamp*1e3;
		for (const jumpcut of this.props.video.jumpcuts) {
			if (jumpcut.at > this.props.offset/1e3) {
				break;
			}

			currTimestamp += jumpcut.duration*1e3;
		}
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
			return <ChatMessage key={m.tags.id} message={m} videoTimestamp={this.props.video.timestamp*1e3} />;
		});

		return (
			<div className={`sidebar-chat ${this.props.sticky ? 'sticky' : ''}`} ref={this.chatRef}>
				{items}
			</div>
		);
	}
}

export default function Sidebar(props) {
	const offset = Math.floor(props.progress * 1000);

	return (
		<div className={`sidebar ${props.visible ? 'visible' : ''}`}>
			<Chat video={props.video} offset={offset} sticky={props.playing} />
		</div>
	);
}
