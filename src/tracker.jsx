
/*
 * Keep track of state, if state is differnet from previous state we should do
 * something.
 * We don't need the Tracker to tell us where we should be into the current
 * stage, since it is just a linear time progressing chuck.
 *
 * Only when we change to a new part should we be notified.
 * We can accomplish this by just keeping track of the previous and current
 * state.
 */

class Tracker {
	constructor(augmentedClip) {
		this.time = 0;

		this.clip = augmentedClip;
	}

	getState() {
		const time = this.time % this.clip.duration;

		let currentPartIndex = null;
		for (let i = this.clip.parts - 1; i >= 0; i--) {
			const p = this.clip.parts[i];
			if (time >= p.at) {
				currentPartIndex = i;
				break;
			}
		}

		return {
			time: time,
			fraction: time / this.clip.duration,

			currentPartIndex,
			currentPart: this.clip.parts[currentPartIndex],

			partTime: time - currentPart.at,
			partFraction: (time - currentPart.at) / currentPart.duration,
		};
	}

	setTime(time) {
		this.time = time;
	}
}
