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

	return res;
}

export default function HypeGraph(props) {
	const { data, error } = swrImmutable(`http://local.lieuwe.xyz:6070/stream/${props.streamId}/hype`, fetcher);

	if (error) {
		console.error('error loading hypegraph', error);
		return <></>;
	} else if (!data) {
		return <></>;
	}

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
};
