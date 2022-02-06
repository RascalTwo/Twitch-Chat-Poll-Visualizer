// #region Helpers
const delay = ms => new Promise(r => setTimeout(r, ms))

const getKeywords = e => shlexSplit(e.value)

const offsetToDate = (start, offset) => {
	const date = new Date(start)
	// TODO - fix offset being wrong
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

Chart.defaults.color = 'white'
Chart.defaults.font.size = 16;

const nowInput = document.querySelector('[placeholder="Current"]')
const playButton = document.querySelector('#play-button')
const rateInput = document.querySelector('[type="number"]')
const endInput = document.querySelector('[placeholder="End"]')
const nowElements = document.querySelectorAll('.current');
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

document.querySelector('fieldset fieldset button').addEventListener('click', addVariant);

// #endregion Variants

document.querySelector('[type="file"]').addEventListener('change', ({ currentTarget: file }) => file.files[0]?.text().then(JSON.parse).then(msgs => {
	const messages = msgs.map(m => ({ ...m, created_at: new Date(m.created_at) }))
	const durationMS = messages.slice(-1)[0].created_at - messages[0].created_at;
	if (!endInput.value) endInput.value = secondsToDHMS(parseInt(durationMS / 1000));
	player.setMessages(messages);
}));


const player = (() => {
	const LINE_ACCR = 30;

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
							labels: [
								{
									render: ({ percentage, value }) => `${value} - ${percentage}%`,
									fontColor: 'black',
									fontSize: 20
								}
							]
						}
					}
				})
				this.chart.canvas.parentElement.classList.remove('hidden');
			},
		},
		line: {
			chart: null,
			canvas: document.querySelectorAll('canvas')[1],
			destroy() {
				return destroyGraph.call(this);
			},
			initialize() {
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
							x: { grid: { color: 'rgba(255, 255, 255, 0.25)' } },
							y: { grid: { color: 'rgba(255, 255, 255, 0.25)' } }
						},
						legend: {
							display: false
						}
					}
				});
				this.chart.canvas.parentElement.classList.remove('hidden');
			}
		},
		word: {
			chart: null,
			canvas: document.querySelectorAll('canvas')[2],
			destroy() {
				return destroyGraph.call(this);
			},
			initialize() {
				this.chart = new Chart(this.canvas.getContext('2d'), {
					type: 'wordCloud',
					data: {
						labels: [''],
						datasets: [{
							label: '',
							data: [50],
						}]
					},
					options: {
						responsive: true,
						maintainAspectRatio: false,
						title: { display: false },
						plugins: { legend: { display: false } }
					}
				})
			}
		}
	}


	let interval = 0;

	let messages = [];
	let messageIndex = 0;

	let variants = [];

	let userVotes = {}
	let words = {}
	const updateWordGraph = (() => {
		let last = 0;
		return () => {
			const now = Date.now()
			if (now - last < 5000) return
			last = now;

			const minimumCount = 0.01 * Math.max(...Object.values(words));

			const chosenWords = Object.entries(words).filter(([_, count]) => count >= minimumCount)
			graphs.word.chart.data.labels = chosenWords.map(([word]) => word);
			graphs.word.chart.data.datasets[0].data = chosenWords.map(([_, count]) => count);
			graphs.word.chart.update();
		}
	})()

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
				labels: [],
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
			/*
			body.split(/\s+/g).forEach(word => {
				if (!(word in words)) words[word] = 0;
				words[word] += 1
			});*/
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
			const label = secondsToDHMS(parseInt((m.created_at - messages[0].created_at) / 1000 / LINE_ACCR) * LINE_ACCR, places)

			if (!graphData.line.labels.includes(label)) graphData.line.labels.push(label)
			graphData.line.counts[vi][label] = graphData.pie[vi];
		})
		if (graphs.pie.chart && arraysDiffer(graphs.pie.chart.data.datasets[0].data, graphData.pie)) {
			graphs.pie.chart.data.datasets[0].data = graphData.pie
			graphs.pie.chart.update();
		}
		if (graphs.line.chart && arraysDiffer(graphs.line.chart.data.labels, graphData.line.labels)) {
			graphs.line.chart.data.labels = graphData.line.labels
			Array.from(graphData.line.counts.entries()).forEach(([i, counts]) => {
				graphs.line.chart.data.datasets[i].data = Object.entries(counts).sort((a, b) => a[0] - b[0]).map(([label, value]) => ({ x: label, y: value }))
			})
			graphs.line.chart.update()
		}
		if (graphs.word.chart) updateWordGraph();



		nowInput.value = secondsToDHMS(nextOffset, places);
		let prettyDHMS = secondsToDHMS(nextOffset, places);
		if (rateInput.value < 1 && !prettyDHMS.includes('.')) prettyDHMS += '.0'
		nowElements.forEach(s => s.textContent = prettyDHMS)
		if (nextOffset >= endSeconds) return player.pause()
	}

	const player = {
		async setGraph(type, visible) {
			if (visible) {
				if (!graphs[type].chart) graphs[type].initialize();
			}
			else graphs[type].destroy();
			await delay(1);
			const activeGraphs = Object.values(graphs).reduce((total, { chart }) => total + (chart ? 1 : 0), 0);
			Object.values(graphs).filter(({ chart }) => chart).map((graph) => {
				graph.chart.canvas.parentElement.style.height = 80 / activeGraphs + 'vh';
				graph.destroy();
				graph.initialize();
			});
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
		hide: () => wrapper.classList.remove('hidden'), // TODO - wordcloud CAN NOT be hidden during init
		// TODO - somehow don't show duplicate/spammy words
		// TODO - only show words of last minute
		async play() {
			userVotes = {}
			messageIndex = 0
			if (!messages.length) return

			const startOffset = DHMStoSeconds(document.querySelector('[name="start"]').value.split(':').map(Number))
			const startDate = offsetToDate(messages[0].created_at, startOffset)
			for (messageIndex = 0; messageIndex < messages.length; messageIndex++) {
				if (messages[messageIndex].created_at >= startDate) break;
			}
			playButton.textContent = 'Pause'
			this.show();
			await delay(1000)
			interval = setInterval(playFrame, 100);
		},
		isPlaying: () => !!interval,
		visible: () => !wrapper.classList.contains('hidden'),
		updateData(cb) {
			const prev = this.isPlaying();
			this.stop();
			cb()
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
			this.updateData(() => {
				variants = newVariants
				for (const key in graphs) {
					const graph = graphs[key]
					if (!graph.chart) continue;
					graph.destroy();
					graph.initialize();
				}
			});
		},
		togglePlaying() {
			this.setPlaying(!this.isPlaying())
		}
	}
	return player;
})();

const updateVariants = () => player.setVariants(Array.from(settings.querySelector('ul').children).slice(1).map(getVariant))

settings.addEventListener('change', updateVariants)

playButton.addEventListener('click', () => player.togglePlaying())


document.querySelectorAll('[name$="graph"]').forEach(checkbox => {

	const name = checkbox.name.split('-')[0];
	player.setGraph(name, checkbox.checked);
	checkbox.addEventListener('change', ({ currentTarget }) => player.setGraph(name, currentTarget.checked))
})


if (window.location.search) {
	Promise.all([...new URLSearchParams(window.location.search).entries()].map(async ([name, value]) => {
		let e = document.querySelector(`[name="${name}"]`)
		if (!e) {
			addVariant(name.split('-')[0])
			e = document.querySelector(`[name="${name}"]`)
		}
		e.value = value
	})).then(updateVariants)
}

const exportForm = () => {
	const params = new URLSearchParams()
	document.querySelectorAll('[name]').forEach(e => {
		if (e.value) params.append(e.getAttribute('name'), e.value)
	})
	console.log(params.toString())
	navigator.clipboard.writeText(params.toString())
}
