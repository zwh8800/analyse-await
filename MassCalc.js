import $ from 'jquery';

function getPower(x) {
	return new Promise(function (resolve, reject) {
		setTimeout(function () {
			resolve(x * x);
		}, 0);
	});
}

async function run() {
	let output = $('.power');
	for (let i = 0; i < 10000; i++) {
		let p = await getPower(i);
		output.append(`<p>${p}</p>`);
	}
}

function run2() {
	var i = 0, end = 10000;
	var cancel = setInterval(function () {
		let p = getPower(i);
		output.append(`<p>${p}</p>`);
		if (++i >= end) {
			clearInterval(cancel);
		}
	}, 0);
}

export default
function () {
	run();
}
