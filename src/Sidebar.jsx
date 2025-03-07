import React, { useEffect, useLayoutEffect, useRef } from 'react';
import chroma from 'chroma-js';
import formatDuration from 'format-duration';
import { Tooltip } from '@mui/material';
import { DataUsage } from '@mui/icons-material';
import tlds from 'tlds';
import makeLinkify from 'linkify-it';
// import { encode } from 'he';

import './Sidebar.css';
import { formatTime, isChromeLike, plural } from './util.js';
import ChatManager from './ChatManager.js';
import {getTwitchName} from './users';
import { convertEmotes } from './emoticons';

const linkify = makeLinkify();
linkify.tlds(tlds);

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

function convertUrls(str) {
	const matches = linkify.match(str);
	const res = [];
	let last = 0;

	const tagMatches = Array.from(str.matchAll(/<[^>]+?>/gi));

	for (const match of (matches || [])) {
		const tagMatch = tagMatches.findLast(m => m.index <= match.index);
		if (tagMatch != null && (match.index < (tagMatch.index + tagMatch[0].length))) {
			continue;
		}

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

function encode(str) {
	const map = [];
	for (let i = 0; i < str.length; i++) {
		map[i] = i;
	}

	const originalLength = str.length;
	for (let i = 0; i < str.length; i++) {
		const c = str[i];

		const replace = replacement => {
			const l = replacement.length;
			str = str.slice(0, i) + replacement + str.slice(i+1);

			for (let j = i + 1; j < originalLength; j++) {
				map[j] += l - 1;
			}

			i += l - 1;
		};

		const fn  = ({
			'&': () => replace('&amp;'),
			'<': () => replace('&lt;'),
			'>': () => replace('&gt;'),
			'"': () => replace('&quot;'),
			"'": () => replace('&#39;'),
			'`': () => replace('&#x60;'),
		})[c] || (() => {});
		fn();
	}

	return [str, map];
}

const ChatMessage = React.memo(props => {
	let [body, map] = encode(props.message.message);
	body = convertEmotes(body, parseEmotes(props.message.tags.emotes || ''), map);
	body = convertUrls(body);

	let color;
	let fontColor;
	if (props.message.tags.color) {
		color = chroma(props.message.tags.color).darken(2).saturate(2).hex();
		if (chroma.contrast(color, 'white') > chroma.contrast(color, 'black')) {
			fontColor = 'white';
		} else {
			fontColor = 'black';
		}
	} else {
		color = '#383838';
		fontColor = 'white';
	}

	const actionFn = ({
		'resub': () => 'resubscribed',
		'sub': () => 'subscribed',
		'subscription': () => 'subscribed',
		'subgift': () => {
			const count = +props.message.tags['msg-param-sender-count'] || 1;
			if (count > 1) {
				return `gifted ${count} ${plural(count, 'sub', 'subs')}`;
			} else {
				return `gifted 1 sub to ${props.message.tags['msg-param-recipient-display-name']}`;
			}
		},
		'submysterygift': () => props.message.tags['system-msg'],
		'raid': () => `raided with ${props.message.tags['msg-param-viewerCount']} viewers`,
	})[props.message.type] || (() => {});
	const action = actionFn();

	let isVip = [
		"lieuwex",
		"genotsknots",
		"lekkerspelen",
		"egbertlive",
	].includes(props.message.tags['display-name'].toLowerCase());

	const username = localStorage.getItem('username');
	if (username != null) {
		const twitchName = getTwitchName(username);
		isVip ||= props.message.message.includes(`@${twitchName}`);
	}

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

			<div className="message-icons">
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
							<img alt="Moderator" src="https://static-cdn.jtvnw.net/badges/v1/3267646d-33f0-4b17-b3df-f923a41db1d0/3" width="72" height="72" decoding="sync" fetchpriority="high" />
						</Tooltip>
					</div>
				}
			</div>

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
		if (isChromeLike()) {
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
