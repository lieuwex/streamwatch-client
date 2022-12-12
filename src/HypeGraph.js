import React from 'react';

import ChartistGraph from 'react-chartist';
import swrImmutable from 'swr/immutable';

import { fetcher } from './util.js';

function smooth(data) {
	const res = [];
	for (let i = 0; i < data.length; i++) {
		const start = Math.max(i - 5, 0);
		const end = Math.min(i + 5, data.length - 1);

		const items = data.slice(start, end+1);
		const sum = items.reduce(((a, b) => a+b), 0);
		res.push(sum / items.length);
	}
	return res;
}

const HypeGraph = React.memo(function HypeGraph(props) {
	let { data, error } = swrImmutable(`http://local.lieuwe.xyz:6070/api/stream/${props.video.id}/hype`, fetcher);

	if (error) {
		console.error('error loading hypegraph', error);
		return <></>;
	} else if (!data) {
		return <></>;
	}

	data = data.filter(x => {
		let delta = x.ts - props.video.timestamp;
		return props.region[0] <= delta && delta <= props.region[1];
	});

	// TODO: keep in mind the jumpcuts here also

	let series = data.map(x => x.hype);
	if (props.smooth ?? true) {
		series = smooth(series);
	}

	const chartData = {
		series: [ series ],
	};

	const options = {
		showArea: true,
		showPoint: false,
		showLine: false,
		width: '100%',
		height: '100%',
		fullWidth: true,
		chartPadding: {
			'top': 0,
			'left': 0,
			'right': 0,
			'bottom': 0,
		},
		axisX: {
			showLabel: false,
			showGrid: false,
		},
		axisY: {
			showLabel: false,
			showGrid: false,
		},
	};

	return <ChartistGraph data={chartData} options={options} type='Line' />;
}, (prevProps, nextProps) => {
	return prevProps.updateTime === nextProps.updateTime
		&& prevProps.video.id === nextProps.video.id
		&& prevProps.region[0] === nextProps.region[0]
		&& prevProps.region[1] === nextProps.region[1];
});

export default HypeGraph;
