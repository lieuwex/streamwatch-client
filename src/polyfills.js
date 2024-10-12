window.global ||= window;

// https://gist.github.com/paullewis/55efe5d6f05434a96c36
window.requestIdleCallback = window.requestIdleCallback ||
	function (cb) {
		return setTimeout(function () {
			var start = Date.now();
			cb({ 
				didTimeout: false,
				timeRemaining: function () {
					return Math.max(0, 50 - (Date.now() - start));
				}
			});
		}, 1);
	};

window.cancelIdleCallback = window.cancelIdleCallback ||
	function (id) {
		clearTimeout(id);
	};
