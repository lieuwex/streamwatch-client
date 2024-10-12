export function augmentClipGroup(clip, clips, videos) {
	clip.duration = 0;
	for (const p of clip.parts) {
		switch (p.type) {
		case 'intermezzo':
			p.duration = 3e3;
			break;
		case 'clip':
			p.clip = clips.find(c => c.id === p.clip_id);
			p.video = videos.find(v => v.id === p.clip.stream_id);
			p.duration = p.clip.duration;
			break;
		}

		p.at = clip.duration;
		clip.duration += p.duration;
	}

	return clip;
}

export default function getClipPart(clip, time) {
	time %= clip.duration;

	let currentPart = null;
	for (let i = clip.parts - 1; i >= 0; i--) {
		const p = clip.parts[i];
		if (time >= p.at) {
			currentPart = p;
			break;
		}
	}

	return [ currentPart, time-currentPart.at ];
}
