/**
 * chartjs-chart-wordcloud
 * https://github.com/sgratzl/chartjs-chart-wordcloud
 *
 * Copyright (c) 2021 Samuel Gratzl <sam@sgratzl.com>
 */

(function (global, factory) {
	typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports, require('chart.js'), require('chart.js/helpers')) :
	typeof define === 'function' && define.amd ? define(['exports', 'chart.js', 'chart.js/helpers'], factory) :
	(global = typeof globalThis !== 'undefined' ? globalThis : global || self, factory(global.ChartWordCloud = {}, global.Chart, global.Chart.helpers));
})(this, (function (exports, chart_js, helpers) { 'use strict';

	var commonjsGlobal = typeof globalThis !== 'undefined' ? globalThis : typeof window !== 'undefined' ? window : typeof global !== 'undefined' ? global : typeof self !== 'undefined' ? self : {};

	var d3Dispatch = {exports: {}};

	(function (module, exports) {
	// https://d3js.org/d3-dispatch/ v1.0.6 Copyright 2019 Mike Bostock
	(function (global, factory) {
	factory(exports) ;
	}(commonjsGlobal, function (exports) {
	var noop = {value: function() {}};

	function dispatch() {
	  for (var i = 0, n = arguments.length, _ = {}, t; i < n; ++i) {
	    if (!(t = arguments[i] + "") || (t in _) || /[\s.]/.test(t)) throw new Error("illegal type: " + t);
	    _[t] = [];
	  }
	  return new Dispatch(_);
	}

	function Dispatch(_) {
	  this._ = _;
	}

	function parseTypenames(typenames, types) {
	  return typenames.trim().split(/^|\s+/).map(function(t) {
	    var name = "", i = t.indexOf(".");
	    if (i >= 0) name = t.slice(i + 1), t = t.slice(0, i);
	    if (t && !types.hasOwnProperty(t)) throw new Error("unknown type: " + t);
	    return {type: t, name: name};
	  });
	}

	Dispatch.prototype = dispatch.prototype = {
	  constructor: Dispatch,
	  on: function(typename, callback) {
	    var _ = this._,
	        T = parseTypenames(typename + "", _),
	        t,
	        i = -1,
	        n = T.length;

	    // If no callback was specified, return the callback of the given type and name.
	    if (arguments.length < 2) {
	      while (++i < n) if ((t = (typename = T[i]).type) && (t = get(_[t], typename.name))) return t;
	      return;
	    }

	    // If a type was specified, set the callback for the given type and name.
	    // Otherwise, if a null callback was specified, remove callbacks of the given name.
	    if (callback != null && typeof callback !== "function") throw new Error("invalid callback: " + callback);
	    while (++i < n) {
	      if (t = (typename = T[i]).type) _[t] = set(_[t], typename.name, callback);
	      else if (callback == null) for (t in _) _[t] = set(_[t], typename.name, null);
	    }

	    return this;
	  },
	  copy: function() {
	    var copy = {}, _ = this._;
	    for (var t in _) copy[t] = _[t].slice();
	    return new Dispatch(copy);
	  },
	  call: function(type, that) {
	    if ((n = arguments.length - 2) > 0) for (var args = new Array(n), i = 0, n, t; i < n; ++i) args[i] = arguments[i + 2];
	    if (!this._.hasOwnProperty(type)) throw new Error("unknown type: " + type);
	    for (t = this._[type], i = 0, n = t.length; i < n; ++i) t[i].value.apply(that, args);
	  },
	  apply: function(type, that, args) {
	    if (!this._.hasOwnProperty(type)) throw new Error("unknown type: " + type);
	    for (var t = this._[type], i = 0, n = t.length; i < n; ++i) t[i].value.apply(that, args);
	  }
	};

	function get(type, name) {
	  for (var i = 0, n = type.length, c; i < n; ++i) {
	    if ((c = type[i]).name === name) {
	      return c.value;
	    }
	  }
	}

	function set(type, name, callback) {
	  for (var i = 0, n = type.length; i < n; ++i) {
	    if (type[i].name === name) {
	      type[i] = noop, type = type.slice(0, i).concat(type.slice(i + 1));
	      break;
	    }
	  }
	  if (callback != null) type.push({name: name, value: callback});
	  return type;
	}

	exports.dispatch = dispatch;

	Object.defineProperty(exports, '__esModule', { value: true });

	}));
	}(d3Dispatch, d3Dispatch.exports));

	// Word cloud layout by Jason Davies, https://www.jasondavies.com/wordcloud/
	// Algorithm due to Jonathan Feinberg, http://static.mrfeinberg.com/bv_ch03.pdf

	var dispatch = d3Dispatch.exports.dispatch;

	var cloudRadians = Math.PI / 180,
	    cw = 1 << 11 >> 5,
	    ch = 1 << 11;

	var d3Cloud = function() {
	  var size = [256, 256],
	      text = cloudText,
	      font = cloudFont,
	      fontSize = cloudFontSize,
	      fontStyle = cloudFontNormal,
	      fontWeight = cloudFontNormal,
	      rotate = cloudRotate,
	      padding = cloudPadding,
	      spiral = archimedeanSpiral,
	      words = [],
	      timeInterval = Infinity,
	      event = dispatch("word", "end"),
	      timer = null,
	      random = Math.random,
	      cloud = {},
	      canvas = cloudCanvas;

	  cloud.canvas = function(_) {
	    return arguments.length ? (canvas = functor(_), cloud) : canvas;
	  };

	  cloud.start = function() {
	    var contextAndRatio = getContext(canvas()),
	        board = zeroArray((size[0] >> 5) * size[1]),
	        bounds = null,
	        n = words.length,
	        i = -1,
	        tags = [],
	        data = words.map(function(d, i) {
	          d.text = text.call(this, d, i);
	          d.font = font.call(this, d, i);
	          d.style = fontStyle.call(this, d, i);
	          d.weight = fontWeight.call(this, d, i);
	          d.rotate = rotate.call(this, d, i);
	          d.size = ~~fontSize.call(this, d, i);
	          d.padding = padding.call(this, d, i);
	          return d;
	        }).sort(function(a, b) { return b.size - a.size; });

	    if (timer) clearInterval(timer);
	    timer = setInterval(step, 0);
	    step();

	    return cloud;

	    function step() {
	      var start = Date.now();
	      while (Date.now() - start < timeInterval && ++i < n && timer) {
	        var d = data[i];
	        d.x = (size[0] * (random() + .5)) >> 1;
	        d.y = (size[1] * (random() + .5)) >> 1;
	        cloudSprite(contextAndRatio, d, data, i);
	        if (d.hasText && place(board, d, bounds)) {
	          tags.push(d);
	          event.call("word", cloud, d);
	          if (bounds) cloudBounds(bounds, d);
	          else bounds = [{x: d.x + d.x0, y: d.y + d.y0}, {x: d.x + d.x1, y: d.y + d.y1}];
	          // Temporary hack
	          d.x -= size[0] >> 1;
	          d.y -= size[1] >> 1;
	        }
	      }
	      if (i >= n) {
	        cloud.stop();
	        event.call("end", cloud, tags, bounds);
	      }
	    }
	  };

	  cloud.stop = function() {
	    if (timer) {
	      clearInterval(timer);
	      timer = null;
	    }
	    return cloud;
	  };

	  function getContext(canvas) {
	    canvas.width = canvas.height = 1;
	    var ratio = Math.sqrt(canvas.getContext("2d").getImageData(0, 0, 1, 1).data.length >> 2);
	    canvas.width = (cw << 5) / ratio;
	    canvas.height = ch / ratio;

	    var context = canvas.getContext("2d");
	    context.fillStyle = context.strokeStyle = "red";
	    context.textAlign = "center";

	    return {context: context, ratio: ratio};
	  }

	  function place(board, tag, bounds) {
	    [{x: 0, y: 0}, {x: size[0], y: size[1]}];
	        var startX = tag.x,
	        startY = tag.y,
	        maxDelta = Math.sqrt(size[0] * size[0] + size[1] * size[1]),
	        s = spiral(size),
	        dt = random() < .5 ? 1 : -1,
	        t = -dt,
	        dxdy,
	        dx,
	        dy;

	    while (dxdy = s(t += dt)) {
	      dx = ~~dxdy[0];
	      dy = ~~dxdy[1];

	      if (Math.min(Math.abs(dx), Math.abs(dy)) >= maxDelta) break;

	      tag.x = startX + dx;
	      tag.y = startY + dy;

	      if (tag.x + tag.x0 < 0 || tag.y + tag.y0 < 0 ||
	          tag.x + tag.x1 > size[0] || tag.y + tag.y1 > size[1]) continue;
	      // TODO only check for collisions within current bounds.
	      if (!bounds || !cloudCollide(tag, board, size[0])) {
	        if (!bounds || collideRects(tag, bounds)) {
	          var sprite = tag.sprite,
	              w = tag.width >> 5,
	              sw = size[0] >> 5,
	              lx = tag.x - (w << 4),
	              sx = lx & 0x7f,
	              msx = 32 - sx,
	              h = tag.y1 - tag.y0,
	              x = (tag.y + tag.y0) * sw + (lx >> 5),
	              last;
	          for (var j = 0; j < h; j++) {
	            last = 0;
	            for (var i = 0; i <= w; i++) {
	              board[x + i] |= (last << msx) | (i < w ? (last = sprite[j * w + i]) >>> sx : 0);
	            }
	            x += sw;
	          }
	          delete tag.sprite;
	          return true;
	        }
	      }
	    }
	    return false;
	  }

	  cloud.timeInterval = function(_) {
	    return arguments.length ? (timeInterval = _ == null ? Infinity : _, cloud) : timeInterval;
	  };

	  cloud.words = function(_) {
	    return arguments.length ? (words = _, cloud) : words;
	  };

	  cloud.size = function(_) {
	    return arguments.length ? (size = [+_[0], +_[1]], cloud) : size;
	  };

	  cloud.font = function(_) {
	    return arguments.length ? (font = functor(_), cloud) : font;
	  };

	  cloud.fontStyle = function(_) {
	    return arguments.length ? (fontStyle = functor(_), cloud) : fontStyle;
	  };

	  cloud.fontWeight = function(_) {
	    return arguments.length ? (fontWeight = functor(_), cloud) : fontWeight;
	  };

	  cloud.rotate = function(_) {
	    return arguments.length ? (rotate = functor(_), cloud) : rotate;
	  };

	  cloud.text = function(_) {
	    return arguments.length ? (text = functor(_), cloud) : text;
	  };

	  cloud.spiral = function(_) {
	    return arguments.length ? (spiral = spirals[_] || _, cloud) : spiral;
	  };

	  cloud.fontSize = function(_) {
	    return arguments.length ? (fontSize = functor(_), cloud) : fontSize;
	  };

	  cloud.padding = function(_) {
	    return arguments.length ? (padding = functor(_), cloud) : padding;
	  };

	  cloud.random = function(_) {
	    return arguments.length ? (random = _, cloud) : random;
	  };

	  cloud.on = function() {
	    var value = event.on.apply(event, arguments);
	    return value === event ? cloud : value;
	  };

	  return cloud;
	};

	function cloudText(d) {
	  return d.text;
	}

	function cloudFont() {
	  return "serif";
	}

	function cloudFontNormal() {
	  return "normal";
	}

	function cloudFontSize(d) {
	  return Math.sqrt(d.value);
	}

	function cloudRotate() {
	  return (~~(Math.random() * 6) - 3) * 30;
	}

	function cloudPadding() {
	  return 1;
	}

	// Fetches a monochrome sprite bitmap for the specified text.
	// Load in batches for speed.
	function cloudSprite(contextAndRatio, d, data, di) {
	  if (d.sprite) return;
	  var c = contextAndRatio.context,
	      ratio = contextAndRatio.ratio;

	  c.clearRect(0, 0, (cw << 5) / ratio, ch / ratio);
	  var x = 0,
	      y = 0,
	      maxh = 0,
	      n = data.length;
	  --di;
	  while (++di < n) {
	    d = data[di];
	    c.save();
	    c.font = d.style + " " + d.weight + " " + ~~((d.size + 1) / ratio) + "px " + d.font;
	    var w = c.measureText(d.text + "m").width * ratio,
	        h = d.size << 1;
	    if (d.rotate) {
	      var sr = Math.sin(d.rotate * cloudRadians),
	          cr = Math.cos(d.rotate * cloudRadians),
	          wcr = w * cr,
	          wsr = w * sr,
	          hcr = h * cr,
	          hsr = h * sr;
	      w = (Math.max(Math.abs(wcr + hsr), Math.abs(wcr - hsr)) + 0x1f) >> 5 << 5;
	      h = ~~Math.max(Math.abs(wsr + hcr), Math.abs(wsr - hcr));
	    } else {
	      w = (w + 0x1f) >> 5 << 5;
	    }
	    if (h > maxh) maxh = h;
	    if (x + w >= (cw << 5)) {
	      x = 0;
	      y += maxh;
	      maxh = 0;
	    }
	    if (y + h >= ch) break;
	    c.translate((x + (w >> 1)) / ratio, (y + (h >> 1)) / ratio);
	    if (d.rotate) c.rotate(d.rotate * cloudRadians);
	    c.fillText(d.text, 0, 0);
	    if (d.padding) c.lineWidth = 2 * d.padding, c.strokeText(d.text, 0, 0);
	    c.restore();
	    d.width = w;
	    d.height = h;
	    d.xoff = x;
	    d.yoff = y;
	    d.x1 = w >> 1;
	    d.y1 = h >> 1;
	    d.x0 = -d.x1;
	    d.y0 = -d.y1;
	    d.hasText = true;
	    x += w;
	  }
	  var pixels = c.getImageData(0, 0, (cw << 5) / ratio, ch / ratio).data,
	      sprite = [];
	  while (--di >= 0) {
	    d = data[di];
	    if (!d.hasText) continue;
	    var w = d.width,
	        w32 = w >> 5,
	        h = d.y1 - d.y0;
	    // Zero the buffer
	    for (var i = 0; i < h * w32; i++) sprite[i] = 0;
	    x = d.xoff;
	    if (x == null) return;
	    y = d.yoff;
	    var seen = 0,
	        seenRow = -1;
	    for (var j = 0; j < h; j++) {
	      for (var i = 0; i < w; i++) {
	        var k = w32 * j + (i >> 5),
	            m = pixels[((y + j) * (cw << 5) + (x + i)) << 2] ? 1 << (31 - (i % 32)) : 0;
	        sprite[k] |= m;
	        seen |= m;
	      }
	      if (seen) seenRow = j;
	      else {
	        d.y0++;
	        h--;
	        j--;
	        y++;
	      }
	    }
	    d.y1 = d.y0 + seenRow;
	    d.sprite = sprite.slice(0, (d.y1 - d.y0) * w32);
	  }
	}

	// Use mask-based collision detection.
	function cloudCollide(tag, board, sw) {
	  sw >>= 5;
	  var sprite = tag.sprite,
	      w = tag.width >> 5,
	      lx = tag.x - (w << 4),
	      sx = lx & 0x7f,
	      msx = 32 - sx,
	      h = tag.y1 - tag.y0,
	      x = (tag.y + tag.y0) * sw + (lx >> 5),
	      last;
	  for (var j = 0; j < h; j++) {
	    last = 0;
	    for (var i = 0; i <= w; i++) {
	      if (((last << msx) | (i < w ? (last = sprite[j * w + i]) >>> sx : 0))
	          & board[x + i]) return true;
	    }
	    x += sw;
	  }
	  return false;
	}

	function cloudBounds(bounds, d) {
	  var b0 = bounds[0],
	      b1 = bounds[1];
	  if (d.x + d.x0 < b0.x) b0.x = d.x + d.x0;
	  if (d.y + d.y0 < b0.y) b0.y = d.y + d.y0;
	  if (d.x + d.x1 > b1.x) b1.x = d.x + d.x1;
	  if (d.y + d.y1 > b1.y) b1.y = d.y + d.y1;
	}

	function collideRects(a, b) {
	  return a.x + a.x1 > b[0].x && a.x + a.x0 < b[1].x && a.y + a.y1 > b[0].y && a.y + a.y0 < b[1].y;
	}

	function archimedeanSpiral(size) {
	  var e = size[0] / size[1];
	  return function(t) {
	    return [e * (t *= .1) * Math.cos(t), t * Math.sin(t)];
	  };
	}

	function rectangularSpiral(size) {
	  var dy = 4,
	      dx = dy * size[0] / size[1],
	      x = 0,
	      y = 0;
	  return function(t) {
	    var sign = t < 0 ? -1 : 1;
	    // See triangular numbers: T_n = n * (n + 1) / 2.
	    switch ((Math.sqrt(1 + 4 * sign * t) - sign) & 3) {
	      case 0:  x += dx; break;
	      case 1:  y += dy; break;
	      case 2:  x -= dx; break;
	      default: y -= dy; break;
	    }
	    return [x, y];
	  };
	}

	// TODO reuse arrays?
	function zeroArray(n) {
	  var a = [],
	      i = -1;
	  while (++i < n) a[i] = 0;
	  return a;
	}

	function cloudCanvas() {
	  return document.createElement("canvas");
	}

	function functor(d) {
	  return typeof d === "function" ? d : function() { return d; };
	}

	var spirals = {
	  archimedean: archimedeanSpiral,
	  rectangular: rectangularSpiral
	};

	class WordElement extends chart_js.Element {
	    static computeRotation(o, rnd) {
	        if (o.rotationSteps <= 1) {
	            return 0;
	        }
	        if (o.minRotation === o.maxRotation) {
	            return o.minRotation;
	        }
	        const base = Math.min(o.rotationSteps, Math.floor(rnd() * o.rotationSteps)) / (o.rotationSteps - 1);
	        const range = o.maxRotation - o.minRotation;
	        return o.minRotation + base * range;
	    }
	    inRange(mouseX, mouseY) {
	        const p = this.getProps(['x', 'y', 'width', 'height', 'scale']);
	        if (p.scale <= 0) {
	            return false;
	        }
	        const x = Number.isNaN(mouseX) ? p.x : mouseX;
	        const y = Number.isNaN(mouseY) ? p.y : mouseY;
	        return x >= p.x - p.width / 2 && x <= p.x + p.width / 2 && y >= p.y - p.height / 2 && y <= p.y + p.height / 2;
	    }
	    inXRange(mouseX) {
	        return this.inRange(mouseX, Number.NaN);
	    }
	    inYRange(mouseY) {
	        return this.inRange(Number.NaN, mouseY);
	    }
	    getCenterPoint() {
	        return this.getProps(['x', 'y']);
	    }
	    tooltipPosition() {
	        return this.getCenterPoint();
	    }
	    draw(ctx) {
	        const { options } = this;
	        const props = this.getProps(['x', 'y', 'width', 'height', 'text', 'scale']);
	        if (props.scale <= 0) {
	            return;
	        }
	        ctx.save();
	        const f = helpers.toFont({ ...options, size: options.size * props.scale });
	        ctx.font = f.string;
	        ctx.fillStyle = options.color;
	        ctx.textAlign = 'center';
	        ctx.translate(props.x, props.y);
	        ctx.rotate((options.rotate / 180) * Math.PI);
	        if (options.strokeStyle) {
	            ctx.strokeStyle = options.strokeStyle;
	            ctx.strokeText(props.text, 0, 0);
	        }
	        ctx.fillText(props.text, 0, 0);
	        ctx.restore();
	    }
	}
	WordElement.id = 'word';
	WordElement.defaults = {
	    minRotation: -90,
	    maxRotation: 0,
	    rotationSteps: 2,
	    padding: 1,
	    strokeStyle: undefined,
	    size: (ctx) => {
	        const v = ctx.parsed.y;
	        return v;
	    },
	    hoverColor: '#ababab',
	};
	WordElement.defaultRoutes = {
	    color: 'color',
	    family: 'font.family',
	    style: 'font.style',
	    weight: 'font.weight',
	    lineHeight: 'font.lineHeight',
	};

	function patchController(type, config, controller, elements = [], scales = []) {
	    chart_js.registry.addControllers(controller);
	    if (Array.isArray(elements)) {
	        chart_js.registry.addElements(...elements);
	    }
	    else {
	        chart_js.registry.addElements(elements);
	    }
	    if (Array.isArray(scales)) {
	        chart_js.registry.addScales(...scales);
	    }
	    else {
	        chart_js.registry.addScales(scales);
	    }
	    const c = config;
	    c.type = type;
	    return c;
	}

	function rnd(seed = Date.now()) {
	    let s = typeof seed === 'number' ? seed : Array.from(seed).reduce((acc, v) => acc + v.charCodeAt(0), 0);
	    return () => {
	        s = (s * 9301 + 49297) % 233280;
	        return s / 233280;
	    };
	}
	class WordCloudController extends chart_js.DatasetController {
	    constructor() {
	        super(...arguments);
	        this.wordLayout = d3Cloud()
	            .text((d) => d.text)
	            .padding((d) => d.options.padding)
	            .rotate((d) => d.options.rotate)
	            .font((d) => d.options.family)
	            .fontSize((d) => d.options.size)
	            .fontStyle((d) => d.options.style)
	            .fontWeight((d) => { var _a; return (_a = d.options.weight) !== null && _a !== void 0 ? _a : 1; });
	        this.rand = Math.random;
	    }
	    update(mode) {
	        super.update(mode);
	        this.rand = rnd(this.chart.id);
	        const meta = this._cachedMeta;
	        const elems = (meta.data || []);
	        this.updateElements(elems, 0, elems.length, mode);
	    }
	    updateElements(elems, start, count, mode) {
	        var _a, _b, _c, _d;
	        this.wordLayout.stop();
	        const xScale = this._cachedMeta.xScale;
	        const yScale = this._cachedMeta.yScale;
	        const w = xScale.right - xScale.left;
	        const h = yScale.bottom - yScale.top;
	        const labels = this.chart.data.labels;
	        const words = [];
	        for (let i = start; i < start + count; i += 1) {
	            const o = this.resolveDataElementOptions(i, mode);
	            if (o.rotate == null) {
	                o.rotate = WordElement.computeRotation(o, this.rand);
	            }
	            const properties = {
	                options: { ...helpers.toFont(o), ...o },
	                x: (_b = (_a = this._cachedMeta.xScale) === null || _a === void 0 ? void 0 : _a.getPixelForDecimal(0.5)) !== null && _b !== void 0 ? _b : 0,
	                y: (_d = (_c = this._cachedMeta.yScale) === null || _c === void 0 ? void 0 : _c.getPixelForDecimal(0.5)) !== null && _d !== void 0 ? _d : 0,
	                width: 10,
	                height: 10,
	                scale: 1,
	                index: i,
	                text: labels[i],
	            };
	            words.push(properties);
	        }
	        if (mode === 'reset') {
	            words.forEach((tag) => {
	                this.updateElement(elems[tag.index], tag.index, tag, mode);
	            });
	            return;
	        }
	        this.wordLayout.random(this.rand).words(words);
	        const run = (factor = 1, tries = 3) => {
	            this.wordLayout
	                .size([w * factor, h * factor])
	                .on('end', (tags, bounds) => {
	                if (tags.length < labels.length) {
	                    if (tries > 0) {
	                        run(factor * 1.2, tries - 1);
	                        return;
	                    }
	                    console.warn('cannot fit all text elements in three tries');
	                }
	                const wb = bounds[1].x - bounds[0].x;
	                const hb = bounds[1].y - bounds[0].y;
	                const dsOptions = this.options;
	                const scale = dsOptions.fit ? Math.min(w / wb, h / hb) : 1;
	                const indices = new Set(labels.map((_, i) => i));
	                tags.forEach((tag) => {
	                    indices.delete(tag.index);
	                    this.updateElement(elems[tag.index], tag.index, {
	                        options: tag.options,
	                        scale,
	                        x: xScale.left + scale * tag.x + w / 2,
	                        y: yScale.top + scale * tag.y + h / 2,
	                        width: scale * tag.width,
	                        height: scale * tag.height,
	                        text: tag.text,
	                    }, mode);
	                });
	                indices.forEach((i) => this.updateElement(elems[i], i, { scale: 0 }, mode));
	            })
	                .start();
	        };
	        run();
	    }
	    draw() {
	        const elements = this._cachedMeta.data;
	        const { ctx } = this.chart;
	        elements.forEach((elem) => elem.draw(ctx));
	    }
	    getLabelAndValue(index) {
	        const r = super.getLabelAndValue(index);
	        const labels = this.chart.data.labels;
	        r.label = labels[index];
	        return r;
	    }
	}
	WordCloudController.id = 'wordCloud';
	WordCloudController.defaults = {
	    datasets: {
	        fit: true,
	        animation: {
	            colors: {
	                properties: ['color', 'strokeStyle'],
	            },
	            numbers: {
	                properties: ['x', 'y', 'size', 'rotate'],
	            },
	        },
	    },
	    maintainAspectRatio: false,
	    dataElementType: WordElement.id,
	};
	WordCloudController.overrides = {
	    scales: {
	        x: {
	            type: 'linear',
	            min: -1,
	            max: 1,
	            display: false,
	        },
	        y: {
	            type: 'linear',
	            min: -1,
	            max: 1,
	            display: false,
	        },
	    },
	};
	class WordCloudChart extends chart_js.Chart {
	    constructor(item, config) {
	        super(item, patchController('wordCloud', config, WordCloudController, WordElement));
	    }
	}
	WordCloudChart.id = WordCloudController.id;

	chart_js.registry.addControllers(WordCloudController);
	chart_js.registry.addElements(WordElement);

	exports.WordCloudChart = WordCloudChart;
	exports.WordCloudController = WordCloudController;
	exports.WordElement = WordElement;

	Object.defineProperty(exports, '__esModule', { value: true });

}));
//# sourceMappingURL=index.umd.js.map
