import React from 'react';

import ChartistGraph from 'react-chartist';
import swrImmutable from 'swr/immutable';

import { fetcher } from './util.js';

function smooth(data) {
	const res = [];

	let buffer = [];
	for (let i = 0; i < data.length; i++) {
		buffer.push(data[i]);

		if (buffer.length === 30) {
			const sum = buffer.reduce(((a, b) => a+b), 0);
			res.push(sum / buffer.length);
			buffer = [];
		}
	}

	if (res.length === 0) {
		// HACK
		return buffer;
	}
	return res;
}

const HypeGraph = React.memo(function HypeGraph(props) {
	let { data, error } = swrImmutable(`http://local.lieuwe.xyz:6070/stream/${props.video.id}/hype`, fetcher);

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

	//const series = smooth(data.map(x => 1.01**(10 * (200+x.hype))));
	const series = smooth(data.map(x => x.hype));

	//console.log(series);

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
	return prevProps.video.id === nextProps.video.id
		&& prevProps.region[0] === nextProps.region[0]
		&& prevProps.region[1] === nextProps.region[1];
});

export default HypeGraph;
