import React from 'react';
import { DateTime } from 'luxon';
import formatDuration from 'format-duration';
import humanizeDuration from 'humanize-duration';

import './Processing.css';
import { formatDate, plural, isChromeLike } from './util.js';
import { getName } from './users.js';

function Preview() {
	return (
		<div className="video-entry-preview">
		</div>
	)
}

function Information(props) {
	const info = props.info;

	const title = info.datapoint_title || info.filename;
	const isLong = title.length > 33;
	const pixels = Math.max(Math.min(750 / title.length, 40), 25);

	const progress = info.finished ? 1 : info.progress;

	let status = <></>;
	if (info.finished) {
		status = <>Klaar, ga zeuren tegen Lieuwe dat die de stream erop moet zetten</>;
	} else if (info.eta == null) {
		status = <>Stream wordt omgezet, eindtijd onbekend</>;
	} else {
		status = <>Klaar over zo'n {humanizeDuration(info.eta * 1e3, { round: true, language: 'nl' })}</>;
	}

	return (
		<div className="video-entry-information">
			<div className={`video-entry-title ${isLong ? 'long' : ''} ${isChromeLike() ? 'clip' : ''}`} style={{ fontSize: `${pixels}px` }}>
				{title}
			</div>

			<div className="video-entry-date">
				{info.started_at
					? formatDate(DateTime.fromSeconds(info.started_at))
					: <></>}
			</div>

			<div className="video-entry-duration">
				{formatDuration(1000 * info.total)}
			</div>

			<div className="video-entry-games">
				{info.games}
			</div>

			<div className="video-entry-persons">
				{status}
			</div>

			<div className="video-entry-progress" style={{ width: `${progress * 100}%` }} />
		</div>
	);
}

export function ProcessingVideo(props) {
	const info = props.info;

	return (
		<div className="video-flipper">
			<div className="video-entry processing">
				<Preview />
				<Information info={info} />
			</div>
		</div>
	);
}
