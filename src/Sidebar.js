import React, { useEffect, useLayoutEffect, useRef } from 'react';
import { isChrome, isChromium, isEdgeChromium } from 'react-device-detect';
import chroma from 'chroma-js';
import formatDuration from 'format-duration';
import { Tooltip } from '@mui/material';
import { DataUsage } from '@mui/icons-material';
import tlds from 'tlds';
import makeLinkify from 'linkify-it';
// import { encode } from 'he';

import './Sidebar.css';
import { formatTime } from './util.js';
import ChatManager from './ChatManager.js';

const linkify = makeLinkify();
linkify.tlds(tlds);

function getTwitchEmoticon(id, theme='dark') {
	return {
		url: `https://static-cdn.jtvnw.net/emoticons/v2/${id}/default/${theme}/4.0`,
		width: 112,
		height: 112,
	};
}
function parseEmotes(emoteString) {
	const emotes = [];
	for (const emote of emoteString.split('/')) {
		if (emote.length === 0) {
			continue;
		}

		let [id, ranges] = emote.split(':');

		ranges = ranges.split(',');
		ranges = ranges.map(x => {
			const [start, end] = x.split('-');
			return {
				start: Number.parseInt(start),
				end: Number.parseInt(end) + 1,
			};
		});

		for (const range of ranges) {
			emotes.push({ id, ...range });
		}
	}

	emotes.sort((a, b) => a.start - b.start);

	return emotes;
}
function convertEmotes(str, emotes) {
	const res = [];
	let last = 0;

	for (const emote of emotes) {
		if (last < emote.start) {
			res.push(str.slice(last, emote.start));
		}

		const content = str.slice(emote.start, emote.end);
		const { url, width, height } = getTwitchEmoticon(emote.id);
		res.push(`<img alt="${content}" title="${content}" src="${url}" width="${width}" height="${height}" decoding="sync"/>`);

		last = emote.end;
	}

	if (last < str.length) {
		res.push(str.slice(last));
	}

	return res.join('');
}

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
	// HACK: we temp removed that encoding step, this is unsafe. (5474481e09f)
	//let body = encode(props.message.message);
	let body = props.message.message;
	body = convertUrls(body);
	body = convertEmotes(body, parseEmotes(props.message.tags.emotes || ''));

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

	const isMod = props.message.tags.badges.moderator === '1';

	const prediction = props.message.tags.badges.predictions;
	const predictionColor = prediction && chroma(prediction.slice(0, prediction.length-2)).saturate(10).brighten().hex();
	const predictionText = props.message.tags['badge-info'].predictions || null;

	const region = props.region[0] * 1000;

	return (
		<div className={`chat-message ${props.message.type} ${isVip ? 'vip' : ''}`}>
			<Tooltip title={formatTime(new Date(props.message.ts))} placement="left">
				<div className="message-timestamp">{formatDuration(props.message.ts - (props.videoTimestamp + region))}</div>
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
			{
				!isMod
				? <></>
				: <div className="message-icon">
					<Tooltip title="Moderator" placement="bottom">
						<img alt="Moderator" src="https://static-cdn.jtvnw.net/badges/v1/3267646d-33f0-4b17-b3df-f923a41db1d0/1" />
					</Tooltip>
				</div>
			}
			<div className="message-author" style={{ backgroundColor: color, color: fontColor }}>{props.message.tags['display-name']}</div>
			{action != null ? <div className="message-action">{action}</div> : <></>}
			<div className="message-content" dangerouslySetInnerHTML={{__html: body}} />
		</div>
	);
}, (prevProps, nextProps) => {
	return prevProps.message.tags.id === nextProps.message.tags.id;
});

const Chat = React.memo(props => {
	const manager = useRef(null);
	useEffect(() => {
		manager.current = new ChatManager(props.video);

		return () => manager.current.close();
	}, []);

	const messages = useRef([]);
	const jumpcutOffset = useRef(0);
	const previousOffset = useRef(null);
	useEffect(() => {
		const dist = Math.abs(props.offset - previousOffset.current);
		if (dist >= 3000) {
			// if more than 3 seconds, clear all messages from the manager
			manager.current.clear();
		}

		const actualTimestamp = props.offset + props.video.timestamp*1e3;
		let currTimestamp = actualTimestamp;
		let currJumpcutOffset = 0;
		for (const jumpcut of props.video.jumpcuts) {
			if (jumpcut.at*1e3 > actualTimestamp) {
				break;
			}

			currJumpcutOffset += jumpcut.duration*1e3;
		}
		currTimestamp += currJumpcutOffset;
		//console.log('currTimestamp', currTimestamp);

		// ensure that we have enough data for now and the future, does not
		// block.
		manager.current.ensureData(currTimestamp);

		// get all messages from the start till now.
		let msgs = manager.current.getBetween(0, currTimestamp);
		// limit the amount of msgs rendered to 300.
		msgs = msgs.slice(Math.max(0, msgs.length - 300), msgs.length);

		messages.current = msgs;
		jumpcutOffset.current = currJumpcutOffset;
		previousOffset.current = props.offset;
	});

	const chatRef = useRef(null);
	useLayoutEffect(() => {
		if (isChrome || isChromium || isEdgeChromium) {
			return;
		} else if (chatRef.current == null) {
			return;
		}

		const el = chatRef.current;
		el.scrollTo(0, el.scrollHeight);
	});

	const items = messages.current.map(m => {
		return <ChatMessage key={m.tags.id} message={m} videoTimestamp={props.video.timestamp*1e3 + jumpcutOffset.current} region={props.region} />;
	});

	return (
		<div className={`sidebar-chat ${props.sticky ? 'sticky' : ''}`} ref={chatRef}>
			{items}
		</div>
	);
}, (prevProps, nextProps) => {
	if (nextProps.sticky !== prevProps.sticky) {
		return false;
	}

	const dist = Math.abs(nextProps.offset - prevProps.offset);
	return dist <= 150;
});

export default function Sidebar(props) {
	const offset = Math.floor(props.progress * 1000);

	return (
		<div className={`sidebar ${props.visible ? 'visible' : ''}`}>
			{
				props.video.has_chat
					? <Chat video={props.video} offset={offset} sticky={props.playing} region={props.region} />
					: <></>
			}
		</div>
	);
}
