// #region Helpers
const delay = ms => new Promise(r => setTimeout(r, ms))

const getKeywords = e => shlexSplit(e.value)

const offsetToDate = (start, offset) => {
	const date = new Date(start)
	date.setSeconds(start.getSeconds() + offset)
	return date
}

function hexToRgb(hex) {
	var bigint = parseInt(hex, 16);
	var r = (bigint >> 16) & 255;
	var g = (bigint >> 8) & 255;
	var b = bigint & 255;

	return { r, g, b }
}


function arraysDiffer(one, two) {
	if (one.length !== two.length) return true;
	for (let i = 0; i < one.length; i++) if (one[i] !== two[i]) return true;
	return false;
}


/**
 * Convert DHMS to seconds, each part is optional except seconds
 *
 * @param {number[]} parts DHMS numeric parts
 * @returns {number} seconds
 */
function DHMStoSeconds(parts) {
	// seconds
	if (parts.length === 1) return parts[0];
	// minutes:seconds
	else if (parts.length === 2) return parts[0] * 60 + parts[1];
	// hours:minutes:seconds
	else if (parts.length === 3) return parts[0] * 60 * 60 + parts[1] * 60 + parts[2];
	// days:hours:minute:seconds
	return parts[0] * 60 * 60 * 24 + parts[1] * 60 * 60 + parts[2] * 60 + parts[3];
}

/**
 * Convert seconds to DHMS
 *
 * @param {number} seconds
 * @returns {string}
 */
function secondsToDHMS(seconds, minimalPlaces = 1) {
	// TODO - fix this rushed math
	const days = Math.floor(seconds / 86400);
	const hours = Math.floor((seconds - days * 86400) / 3600);
	const minutes = Math.floor((seconds % (60 * 60)) / 60);
	const parts = [days, hours, minutes, (seconds % 60).toFixed(1)];
	if (parts[3].includes('.') && parts[3] < 10) parts[3] = '0' + parts[3]
	while (!parts[0] && parts.length > minimalPlaces) parts.shift();
	return parts.map(num => num.toString().padStart(2, '0')).join(':');
}

// #endregion Helpers

// #region Theme

const [addThemeListener, getCurrentTheme, renderTheme] = (() => {
	const THEME_COLORS = {
		'Light': ['white', 'black'],
		'Dark': ['black', 'white'],
		'Discord': ['#36393e', 'white'],
		'Twitter Dim': ['rgb(21, 32, 43)', 'white'],
		'GitHub Dark': ['#0d1117', 'white']
	}
	const html = document.querySelector('html');
	const select = document.querySelector('select');
	select.children[+window.matchMedia('(prefers-color-scheme: dark)').matches].setAttribute('selected', '');

	const listeners = [];

	const renderTheme = async (background, text) => {
		if (!background || !text) ([background, text] = THEME_COLORS[select.value]);
		html.style.setProperty('--background-color', background);
		html.style.setProperty('--color', text);
		for (const listener of listeners) await listener(background, text);
	}
	renderTheme()


	select.addEventListener('change', ({ currentTarget: { value } }) => renderTheme(...THEME_COLORS[value]));

	return [
		(listener) => {
			listeners.push(listener);
			listener(...THEME_COLORS[select.value])
		},
		() => THEME_COLORS[select.value],
		renderTheme
	]
})()

addThemeListener((background, text) => {
	Chart.defaults.color = text;
});

// #endregion Theme

Chart.defaults.font.size = 16;

const nowInput = document.querySelector('[name="current"]')
const playButton = document.querySelector('#play-button')
const rateInput = document.querySelector('[name="rate"]')
const endInput = document.querySelector('[name="end"]')
const nowDisplay = document.querySelector('.current');
const settings = document.querySelector('.settings')

// #region Variants
document.querySelector('details').addEventListener('toggle', ({ currentTarget: { open } }) => open ? player.stop() : undefined);

const getVariant = root => {
	const [color, label, keywords] = Array.from(root.querySelectorAll('input')).map(input => input.value);
	return { color, label, keywords: shlexSplit(keywords) }
}

function addVariant(id = Date.now()) {
	const list = document.querySelector('fieldset fieldset ul')
	const li = document.createElement('li')
	li.innerHTML = `
	<input name="${id}-color" type="color" placeholder="Color" autocomplete="on" />
	<input name="${id}-label" placeholder="Label" autocomplete="on" />
	<input name="${id}-keywords" placeholder="Keywords" autocomplete="on" />
	<button type="button">-</button>
	`.trim()
	li.querySelector('button').addEventListener('click', () => li.remove());
	list.appendChild(li);
}

document.querySelector('fieldset fieldset button').addEventListener('click', addVariant.bind(null, undefined));

// #endregion Variants

document.querySelector('[type="file"]').addEventListener('change', ({ currentTarget: file }) => file.files[0]?.text().then(JSON.parse).then(msgs => {
	const messages = msgs.map(m => ({ ...m, created_at: new Date(m.created_at) }))
	const durationMS = messages.slice(-1)[0].created_at - messages[0].created_at;
	if (!endInput.value) endInput.value = secondsToDHMS(parseInt(durationMS / 1000));
	player.setMessages(messages);
	alert(`${messages.length} messages loaded`);
}));


let binSize = 1;

const player = (() => {

	const wrapper = document.querySelector('#player');
	function destroyGraph() {
		this.canvas.parentElement.classList.add('hidden');
		if (!this.chart) return;
		this.chart.destroy();
		this.chart = null;
	}
	const graphs = {
		pie: {
			chart: null,
			canvas: document.querySelector('canvas'),
			destroy() {
				return destroyGraph.call(this);
			},
			initialize() {
				this.canvas.parentElement.classList.remove('hidden');
				this.chart = new Chart(this.canvas.getContext('2d'), {
					type: 'pie',
					plugins: [ChartDataLabels],
					data: {
						labels: variants.map(variant => variant.label),
						datasets: [{
							data: variants.map(() => 0),
							backgroundColor: variants.map(variant => variant.color)
						}]
					},
					options: {
						responsive: true,
						maintainAspectRatio: false,
						plugins: {
							datalabels: {
								color(context) {
									return context.dataset.data[context.dataIndex] === 0 ? 'transparent' : getCurrentTheme()[1]
								}
							},
							legend: { display: false }
						}
					}
				})
			},
			update() {
				this.chart.update()
			}
		},
		line: {
			chart: null,
			canvas: document.querySelectorAll('canvas')[1],
			destroy() {
				return destroyGraph.call(this);
			},
			initialize() {
				this.canvas.parentElement.classList.remove('hidden');
				const color = this.getLineColor();
				this.chart = new Chart(this.canvas.getContext('2d'), {
					type: 'line',
					data: {
						labels: ['00'],
						datasets: variants.map(variant => ({
							label: variant.label,
							borderColor: variant.color,
							fill: false,
							data: [],
							parsing: false,
						}))
					},
					options: {
						responsive: true,
						maintainAspectRatio: false,
						scales: {
							x: { grid: { color } },
							y: { grid: { color }, ticks: { precision: 0 } }
						},
						plugins: { legend: { display: false } }
					}
				});
			},
			update() {
				this.chart.options.scales.x.grid.color = this.chart.options.scales.y.grid.color = this.getLineColor();
				this.chart.options.scales.x.ticks.color = this.chart.options.scales.y.ticks.color = getCurrentTheme()[1]
				this.chart.update();
			},
			getLineColor() {
				return getCurrentTheme()[1] === 'black' ? 'rgba(0, 0, 0, 0.25)' : 'rgba(255, 255, 255, 0.25)';
			}
		}
	}


	let interval = 0;

	let messages = [];
	let messageIndex = 0;

	let variants = [];

	let userVotes = {}

	function playFrame() {
		const endSeconds = DHMStoSeconds(endInput.value.split(':').map(Number))
		const places = endInput.value.split(':').length
		const offset = DHMStoSeconds(nowInput.value.split(':').map(Number))
		const nextOffset = offset + (Number(rateInput.value) * 0.1);
		const now = offsetToDate(messages[0].created_at, offset)

		const validMessages = [];

		const graphData = {
			pie: variants.map(() => 0),
			line: {
				labels: { first: '', last: '' },
				counts: variants.map(() => ({}))
			}
		}
		for (; messageIndex < messages.length; messageIndex++) {
			if (messages[messageIndex].created_at <= now) validMessages.push(messages[messageIndex])
			else break
		}
		validMessages.map(message => {
			const body = message.message.body.toLowerCase();
			/** [[word index, variant index]] */
			const vis = variants.map(({ keywords }) => keywords
				.map((word, vi) => [body.indexOf(word), vi])
				.filter(([wi]) => wi !== -1)
				.map(([wi]) => wi)
			)
			return [message, vis]
		}).filter(([_, vis]) => vis.some(p => p.length)).forEach(([m, vis]) => {
			if (vis[1].filter(v => v.length).length > 1) return;

			if (!(m.commenter._id in userVotes)) {
				userVotes[m.commenter._id] = [[m, vis, 1]]
				return;
			}
			// b  b   l  l b
			// bl bl bl bl bl
			// 10 10 01 01 10
			const commenterVotes = userVotes[m.commenter._id]
			const last = commenterVotes.at(-1);
			if (last[1].findIndex(v => v.length) === vis.findIndex(v => v.length)) return;
			if (commenterVotes.length) commenterVotes.push([m, last[1], -1])
			commenterVotes.push([m, vis, 1])
		})
		Object.values(userVotes).flat().sort((a, b) => a[0].created_at - b[0].created_at).forEach(([m, vis, change]) => {
			if (vis.filter(p => p.length).length !== 1) return;
			const vi = vis.findIndex(p => p.length)
			graphData.pie[vi] += change
			const label = secondsToDHMS(parseInt((m.created_at - messages[0].created_at) / 1000 / binSize) * binSize, places)

			if (!graphData.line.labels.first) graphData.line.labels.first = label;
			graphData.line.labels.last = label;
			graphData.line.counts[vi][label] = graphData.pie[vi];
		})
		if (graphs.pie.chart && arraysDiffer(graphs.pie.chart.data.datasets[0].data, graphData.pie)) {
			graphs.pie.chart.data.datasets[0].data = graphData.pie
			graphs.pie.chart.update();
		}
		if (graphs.line.chart && arraysDiffer(graphs.line.chart.data.labels, graphData.line.labels)) {
			let current = DHMStoSeconds(graphData.line.labels.first.split(':').map(Number));
			const end = DHMStoSeconds(graphData.line.labels.last.split(':').map(Number));
			graphs.line.chart.data.labels = [graphData.line.labels.first];

			while (current <= end) {
				current += binSize;
				graphs.line.chart.data.labels.push(secondsToDHMS(current, places));
			}
			Array.from(graphData.line.counts.entries()).forEach(([i, counts]) => {
				graphs.line.chart.data.datasets[i].data = Object.entries(counts).sort((a, b) => a[0] - b[0]).map(([label, value]) => ({ x: label, y: value }))
			})
			graphs.line.chart.update()
		}

		nowInput.value = secondsToDHMS(nextOffset, places);
		let prettyDHMS = secondsToDHMS(nextOffset, places);
		if (rateInput.value < 1 && !prettyDHMS.includes('.')) prettyDHMS += '.0'
		nowDisplay.textContent = prettyDHMS
		if (nextOffset >= endSeconds) return player.pause()
	}

	const player = {
		async setGraph(type, visible) {
			if (visible) {
				if (!graphs[type].chart) graphs[type].initialize();
			}
			else graphs[type].destroy();
			const activeGraphs = Object.values(graphs).reduce((total, { chart }) => total + (chart ? 1 : 0), 0);
			let currentFound = false;
			for (const graph of Object.values(graphs).filter(({ chart }) => chart)) {
				graph.canvas.parentElement.style.height = 85 / activeGraphs + 'vh';
				graph.chart.options.plugins.legend.display = !currentFound;
				await delay(1);
				graph.update();
				currentFound = true;
			}
		},
		stop() {
			this.pause();
			this.hide();
			nowInput.value = '0';
		},
		pause() {
			clearInterval(interval);
			interval = null;
			playButton.textContent = 'Play'
		},
		show: () => wrapper.classList.remove('hidden'),
		hide: () => wrapper.classList.remove('hidden'),
		async play(ms = 1000) {
			userVotes = {}
			messageIndex = 0
			if (!messages.length) return alert('No Messages Loaded')

			const startOffset = DHMStoSeconds(document.querySelector('[name="start"]').value.split(':').map(Number))
			if (DHMStoSeconds(nowInput.value.split(':').map(Number)) < startOffset) nowInput.value = secondsToDHMS(startOffset);
			const startDate = offsetToDate(messages[0].created_at, startOffset)
			for (messageIndex = 0; messageIndex < messages.length; messageIndex++) {
				if (messages[messageIndex].created_at >= startDate) break;
			}
			playButton.textContent = 'Pause'
			this.show();
			wrapper.style.opacity = '0';
			await delay(ms)
			wrapper.style.opacity = '1';
			interval = setInterval(playFrame, 100);
		},
		isPlaying: () => !!interval,
		visible: () => !wrapper.classList.contains('hidden'),
		async updateData(cb) {
			const prev = this.isPlaying();
			this.stop();
			await cb()
			this.setPlaying(prev);
		},
		setPlaying(playing) {
			if (playing && interval || !playing && !interval) return;

			if (playing) {
				this.play();
				document.querySelector('details').open = false;
			}
			else this.pause()
		},
		setMessages(newMessages) {
			this.updateData(() => messages = newMessages)
		},
		setVariants(newVariants) {
			this.updateData(async () => {
				variants = newVariants
				for (const key in graphs) {
					const graph = graphs[key]
					if (!graph.chart) continue;
					graph.destroy();
					graph.initialize();
					await this.setGraph(key, true);
				}
			});
		},
		togglePlaying() {
			this.setPlaying(!this.isPlaying())
		}
	}

	addThemeListener(async () => {
		for (const [key] of Object.entries(graphs).filter(([_, { chart }]) => chart)) {
			await player.setGraph(key, true);
		}
	})

	return player;
})();

document.querySelector('#redraw-button').addEventListener('click', async () => {
	const now = nowInput.value;
	await player.play(0);
	await delay(150);
	await player.pause()
	nowInput.value = now;
})

const updateVariants = () => player.setVariants(Array.from(settings.querySelector('ul').children).slice(1).map(getVariant))

settings.addEventListener('change', updateVariants)

playButton.addEventListener('click', () => player.togglePlaying());


(async () => {
	for (const checkbox of document.querySelectorAll('[name$="graph"]')) {
		const name = checkbox.name.split('-')[0];
		await player.setGraph(name, checkbox.checked);
		checkbox.addEventListener('change', ({ currentTarget }) => player.setGraph(name, currentTarget.checked))
	}
})();


if (window.location.search) {
	Promise.all([...new URLSearchParams(window.location.search).entries()].map(async ([name, value]) => {
		let e = document.querySelector(`[name="${name}"]`)
		if (!e) {
			addVariant(name.split('-')[0])
			e = document.querySelector(`[name="${name}"]`)
		}
		e.value = value
		if (name === 'theme') renderTheme()
	})).then(updateVariants)
}

(() => {
	const input = document.querySelector('[name="line-bins"]');
	binSize = +input.value;
	input.addEventListener('input', ({ currentTarget: { value } }) => binSize = +value);
})();

const exportForm = () => {
	const params = new URLSearchParams()
	document.querySelectorAll('[name]').forEach(e => {
		if (e.value) params.append(e.getAttribute('name'), e.value)
	})
	return params.toString();
}

document.querySelector('#save-button').addEventListener('click', () => {
	window.location.search = exportForm()
})