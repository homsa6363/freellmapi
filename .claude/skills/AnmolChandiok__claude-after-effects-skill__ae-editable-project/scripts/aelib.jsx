// aelib.jsx — builds a native, fully editable After Effects project from a scene
// description (see references/scene-spec.md). ExtendScript (ES3): no let/const,
// no arrow functions, no Array.forEach/map, no JSON object.
//
// make_jsx.js appends:  var SCENE = {...};  AEB.build(SCENE);

var AEB = (function () {
  var LOG = [];
  function log(s) { LOG.push(s); }

  // ---------------------------------------------------------------- helpers
  // NOTE: ExtendScript misparses chained ternaries (a ? b : c ? d : e), so use lookups.
  function pick(table, key, dflt) { return (key !== undefined && table.hasOwnProperty(key)) ? table[key] : dflt; }
  function isArr(v) { return v instanceof Array; }
  function isAnim(v) { return v !== null && typeof v === 'object' && !isArr(v) && v.k !== undefined; }
  function col(c) { // accepts [r,g,b] 0-1, [r,g,b] 0-255, or "#rrggbb"
    if (typeof c === 'string') { var h = c.replace('#', ''); return [parseInt(h.substr(0, 2), 16) / 255, parseInt(h.substr(2, 2), 16) / 255, parseInt(h.substr(4, 2), 16) / 255]; }
    if (c[0] > 1 || c[1] > 1 || c[2] > 1) return [c[0] / 255, c[1] / 255, c[2] / 255];
    return [c[0], c[1], c[2]];
  }
  function col4(c) { var x = col(c); return [x[0], x[1], x[2], 1]; }
  function dimsOf(prop) {
    var t = prop.propertyValueType;
    if (t === PropertyValueType.TwoD_SPATIAL || t === PropertyValueType.ThreeD_SPATIAL) return 1;
    if (t === PropertyValueType.TwoD) return 2;
    if (t === PropertyValueType.ThreeD) return 3;
    return 1;
  }
  function isSpatial(prop) { var t = prop.propertyValueType; return t === PropertyValueType.TwoD_SPATIAL || t === PropertyValueType.ThreeD_SPATIAL; }

  // value conversion per property kind
  function conv(prop, v, kind) {
    if (kind === 'color') return col4(v);
    if (prop.propertyValueType === PropertyValueType.COLOR) return col4(v);
    return v;
  }

  // ease spec: 'linear' | 'hold' | 'ease' | number (influence) | {i:[speed,infl], o:[speed,infl]}
  function applyEase(prop, idx, e) {
    if (e === undefined || e === null) e = 'ease';
    if (e === 'hold') { prop.setInterpolationTypeAtKey(idx, KeyframeInterpolationType.HOLD, KeyframeInterpolationType.HOLD); return; }
    if (e === 'linear') { prop.setInterpolationTypeAtKey(idx, KeyframeInterpolationType.LINEAR, KeyframeInterpolationType.LINEAR); return; }
    var d = dimsOf(prop), iS = 0, iI = 33.333, oS = 0, oI = 33.333;
    if (typeof e === 'number') { iI = e; oI = e; }
    else if (e === 'ease') { iI = 40; oI = 40; }
    else if (typeof e === 'object') {
      if (e.i) { iS = e.i[0]; iI = e.i[1]; }
      if (e.o) { oS = e.o[0]; oI = e.o[1]; }
    }
    var ins = [], outs = [];
    for (var k = 0; k < d; k++) {
      var si = isArr(iS) ? iS[Math.min(k, iS.length - 1)] : iS, so = isArr(oS) ? oS[Math.min(k, oS.length - 1)] : oS;
      ins.push(new KeyframeEase(si, Math.max(0.1, Math.min(100, iI))));
      outs.push(new KeyframeEase(so, Math.max(0.1, Math.min(100, oI))));
    }
    prop.setInterpolationTypeAtKey(idx, KeyframeInterpolationType.BEZIER, KeyframeInterpolationType.BEZIER);
    prop.setTemporalEaseAtKey(idx, ins, outs);
  }

  // set a static value or keyframes: {k: [[t, v, ease], ...]}
  function setProp(prop, v, kind) {
    if (v === undefined || v === null || !prop) return;
    if (isAnim(v)) {
      var keys = v.k, i;
      for (i = 0; i < keys.length; i++) prop.setValueAtTime(keys[i][0], conv(prop, keys[i][1], kind));
      for (i = 0; i < keys.length; i++) {
        var idx = prop.nearestKeyIndex(keys[i][0]);
        applyEase(prop, idx, keys[i][2] !== undefined ? keys[i][2] : v.ease);
        if (isSpatial(prop)) { // straight spatial paths, no auto-bezier wander
          try {
            var z = prop.value.length === 3 ? [0, 0, 0] : [0, 0];
            prop.setSpatialAutoBezierAtKey(idx, false); prop.setSpatialContinuousAtKey(idx, false);
            prop.setSpatialTangentsAtKey(idx, z, z);
          } catch (e1) {}
        }
      }
      if (v.expr) prop.expression = v.expr;
    } else {
      prop.setValue(conv(prop, v, kind));
    }
  }

  // ---------------------------------------------------------------- shapes
  var KAPPA = 0.5522847;
  function shapeFrom(s) {
    var sh = new Shape();
    if (s.type === 'rect') {
      sh.vertices = [[s.x, s.y], [s.x + s.w, s.y], [s.x + s.w, s.y + s.h], [s.x, s.y + s.h]]; sh.closed = true;
    } else if (s.type === 'ellipse') {
      var cx = s.cx, cy = s.cy, rx = s.rx, ry = s.ry, kx = rx * KAPPA, ky = ry * KAPPA;
      sh.vertices = [[cx, cy - ry], [cx + rx, cy], [cx, cy + ry], [cx - rx, cy]];
      sh.inTangents = [[-kx, 0], [0, -ky], [kx, 0], [0, ky]];
      sh.outTangents = [[kx, 0], [0, ky], [-kx, 0], [0, -ky]];
      sh.closed = true;
    } else {
      sh.vertices = s.points; sh.closed = s.closed !== false;
      if (s.inTangents) sh.inTangents = s.inTangents;
      if (s.outTangents) sh.outTangents = s.outTangents;
    }
    return sh;
  }

  function addShapeGroups(layer, groups) {
    var root = layer.property('ADBE Root Vectors Group');
    for (var g = 0; g < groups.length; g++) {
      var G = groups[g], grp = root.addProperty('ADBE Vector Group');
      if (G.name) grp.name = G.name;
      var vecs = grp.property('ADBE Vectors Group');
      for (var p = 0; p < G.paths.length; p++) {
        var P = G.paths[p], prop;
        if (P.type === 'rect' && !P.asPath) {
          prop = vecs.addProperty('ADBE Vector Shape - Rect');
          prop.property('ADBE Vector Rect Size').setValue([P.w, P.h]);
          prop.property('ADBE Vector Rect Position').setValue([P.x + P.w / 2, P.y + P.h / 2]);
          if (P.r) prop.property('ADBE Vector Rect Roundness').setValue(P.r);
        } else if (P.type === 'ellipse' && !P.asPath) {
          prop = vecs.addProperty('ADBE Vector Shape - Ellipse');
          prop.property('ADBE Vector Ellipse Size').setValue([P.rx * 2, P.ry * 2]);
          prop.property('ADBE Vector Ellipse Position').setValue([P.cx, P.cy]);
        } else {
          prop = vecs.addProperty('ADBE Vector Shape - Group');
          prop.property('ADBE Vector Shape').setValue(shapeFrom(P));
        }
        if (P.name) prop.name = P.name;
      }
      if (G.trim) {
        var tr = vecs.addProperty('ADBE Vector Filter - Trim');
        setProp(tr.property('ADBE Vector Trim Start'), G.trim.start);
        setProp(tr.property('ADBE Vector Trim End'), G.trim.end);
        if (G.trim.offset !== undefined) setProp(tr.property('ADBE Vector Trim Offset'), G.trim.offset);
      }
      if (G.stroke) {
        var st = vecs.addProperty('ADBE Vector Graphic - Stroke'), S = G.stroke;
        setProp(st.property('ADBE Vector Stroke Color'), S.color, 'color');
        setProp(st.property('ADBE Vector Stroke Width'), S.width === undefined ? 4 : S.width);
        setProp(st.property('ADBE Vector Stroke Opacity'), S.opacity === undefined ? 100 : S.opacity);
        st.property('ADBE Vector Stroke Line Cap').setValue(pick({ butt: 1, round: 2, square: 3 }, S.cap, 1));
        st.property('ADBE Vector Stroke Line Join').setValue(pick({ miter: 1, round: 2, bevel: 3 }, S.join, 1));
        if (S.dash) {
          var ds = st.property('ADBE Vector Stroke Dashes');
          ds.addProperty('ADBE Vector Stroke Dash 1').setValue(S.dash[0]);
          ds.addProperty('ADBE Vector Stroke Gap 1').setValue(S.dash[1]);
        }
      }
      if (G.fill) {
        var fl = vecs.addProperty('ADBE Vector Graphic - Fill');
        setProp(fl.property('ADBE Vector Fill Color'), G.fill.color, 'color');
        setProp(fl.property('ADBE Vector Fill Opacity'), G.fill.opacity === undefined ? 100 : G.fill.opacity);
      }
      if (G.transform) {
        var gt = grp.property('ADBE Vector Transform Group'), T = G.transform;
        setProp(gt.property('ADBE Vector Anchor'), T.anchor); setProp(gt.property('ADBE Vector Position'), T.position);
        setProp(gt.property('ADBE Vector Scale'), T.scale); setProp(gt.property('ADBE Vector Rotation'), T.rotation);
        setProp(gt.property('ADBE Vector Group Opacity'), T.opacity);
      }
    }
  }

  // ---------------------------------------------------------------- text
  var JUST = { left: 'LEFT_JUSTIFY', center: 'CENTER_JUSTIFY', right: 'RIGHT_JUSTIFY' };
  function textDoc(layer, L) {
    var stp = layer.property('ADBE Text Properties').property('ADBE Text Document');
    var d = stp.value;
    d.resetCharStyle(); d.resetParagraphStyle();
    d.text = L.text;
    if (L.font) d.font = L.font;
    d.fontSize = L.size || 72;
    d.applyFill = true; d.fillColor = col(L.color || [0, 0, 0]);
    d.applyStroke = false;
    d.tracking = typeof L.tracking === 'number' ? L.tracking : 0;
    if (L.leading) { d.autoLeading = false; d.leading = L.leading; }
    d.justification = ParagraphJustification[JUST[L.justify || 'left']];
    stp.setValue(d);
    if (isAnim(L.tracking)) { // animated tracking via a text animator (keeps the text itself editable)
      var an = layer.property('ADBE Text Properties').property('ADBE Text Animators').addProperty('ADBE Text Animator');
      an.name = 'Tracking';
      var tp = an.property('ADBE Text Animator Properties').addProperty('ADBE Text Tracking Amount');
      // the animator's Tracking Amount is in pixels, not 1/1000 em: convert so the spec stays in em/1000
      var tk = [], sz = L.size || 72;
      for (var q = 0; q < L.tracking.k.length; q++) tk.push([L.tracking.k[q][0], L.tracking.k[q][1] * sz / 1000, L.tracking.k[q][2]]);
      setProp(tp, { k: tk, ease: L.tracking.ease });
    }
  }
  function measure(comp, L, str) {
    var t = comp.layers.addText(str || ' ');
    textDoc(t, { text: str || ' ', font: L.font, size: L.size, tracking: isAnim(L.tracking) ? 0 : L.tracking, justify: 'left' });
    var r = t.sourceRectAtTime(0, false); t.remove();
    return r.width;
  }
  // word-by-word reveal via Linear Wipe; completion keys computed from measured word widths
  // Word-by-word reveal with a rectangular mask whose right edge is keyed per word.
  // (A Linear Wipe on a text layer spans the whole comp width, not the text, so its
  // completion values don't line up with words; a mask lives in the text's own space.)
  function wordReveal(comp, layer, L) {
    var R = L.reveal, words = L.text.split(' ');
    var rect = layer.sourceRectAtTime(Math.max(0, R.times[0]), false);
    var total = measure(comp, L, L.text), size = L.size || 72, pad = size * 0.35;
    var top = rect.top - pad, h = rect.height + pad * 2, left = rect.left - pad;
    function edge(frac) { return frac <= 0 ? left : rect.left + rect.width * frac + (frac >= 1 ? pad : 0); }
    function box(x) { return shapeFrom({ type: 'rect', x: left, y: top, w: Math.max(0.5, x - left), h: h }); }
    var m = layer.property('ADBE Mask Parade').addProperty('ADBE Mask Atom');
    m.name = 'Write-on (one key pair per word)';
    m.property('ADBE Mask Feather').setValue([R.feather === undefined ? size * 0.12 : R.feather, 0]);
    var prop = m.property('ADBE Mask Shape'), keys = [], prev = 0, pre = '';
    keys.push([Math.max(0, R.times[0] - 0.05), box(edge(0)), 'hold']);
    for (var i = 0; i < words.length && i < R.times.length; i++) {
      pre = pre ? pre + ' ' + words[i] : words[i];
      var frac = i === words.length - 1 ? 1 : Math.min(1, measure(comp, L, pre) / total);
      var t0 = R.times[i], t1 = R.times[i] + (R.dur || 0.28);
      if (i + 1 < R.times.length) t1 = Math.min(t1, R.times[i + 1] - 0.01); // never overlap the next word
      if (t0 > keys[keys.length - 1][0] + 0.005) keys.push([t0, box(edge(prev)), 'linear']);
      keys.push([Math.max(t1, t0 + 0.02), box(edge(frac)), { i: [0, 60], o: [0, 33] }]);
      prev = frac;
    }
    for (var k = 0; k < keys.length; k++) prop.setValueAtTime(keys[k][0], keys[k][1]);
    for (k = 0; k < keys.length; k++) applyEase(prop, prop.nearestKeyIndex(keys[k][0]), keys[k][2]);
  }


  // ---------------------------------------------------------------- masks & effects
  function addMasks(layer, masks) {
    var parade = layer.property('ADBE Mask Parade');
    for (var i = 0; i < masks.length; i++) {
      var M = masks[i], m = parade.addProperty('ADBE Mask Atom');
      if (M.name) m.name = M.name;
      var shp = M.shape;
      if (isAnim(shp)) { var ks = []; for (var j = 0; j < shp.k.length; j++) ks.push([shp.k[j][0], shapeFrom(shp.k[j][1]), shp.k[j][2]]); setProp(m.property('ADBE Mask Shape'), { k: ks }); }
      else m.property('ADBE Mask Shape').setValue(shapeFrom(shp));
      m.maskMode = pick({ add: MaskMode.ADD, subtract: MaskMode.SUBTRACT, intersect: MaskMode.INTERSECT, difference: MaskMode.DIFFERENCE, none: MaskMode.NONE }, M.mode, MaskMode.ADD);
      if (M.inverted) m.inverted = true;
      if (M.feather !== undefined) setProp(m.property('ADBE Mask Feather'), isArr(M.feather) || isAnim(M.feather) ? M.feather : [M.feather, M.feather]);
      if (M.opacity !== undefined) setProp(m.property('ADBE Mask Opacity'), M.opacity);
      if (M.expansion !== undefined) setProp(m.property('ADBE Mask Offset'), M.expansion);
    }
  }
  function addEffects(layer, effects) {
    var parade = layer.property('ADBE Effect Parade');
    for (var i = 0; i < effects.length; i++) {
      var E = effects[i], fx;
      try { fx = parade.addProperty(E.match); } catch (e) { log('effect missing: ' + E.match + ' on ' + layer.name); continue; }
      if (E.name) fx.name = E.name;
      for (var key in E.props) {
        if (!E.props.hasOwnProperty(key)) continue;
        var p = fx.property(key);
        if (!p) { log('effect prop missing: ' + E.match + '/' + key); continue; }
        try { setProp(p, E.props[key]); } catch (e2) { log('effect prop error ' + key + ': ' + e2); }
      }
    }
  }

  // ---------------------------------------------------------------- layers
  var BLEND = { add: 'ADD', screen: 'SCREEN', multiply: 'MULTIPLY', overlay: 'OVERLAY', 'soft-light': 'SOFT_LIGHT', normal: 'NORMAL', darken: 'DARKEN', lighten: 'LIGHTEN' };

  function createLayer(comp, L, ctx) {
    var ly;
    switch (L.type) {
      case 'solid': ly = comp.layers.addSolid(col(L.color || [0, 0, 0]), L.name || 'Solid', Math.round(L.width || comp.width), Math.round(L.height || comp.height), 1); break;
      case 'null': ly = comp.layers.addNull(); break;
      case 'adjustment': ly = comp.layers.addSolid([1, 1, 1], L.name || 'Adjustment', comp.width, comp.height, 1); ly.adjustmentLayer = true; break;
      case 'text': ly = comp.layers.addText(L.text); textDoc(ly, L); break;
      case 'shape': ly = comp.layers.addShape(); addShapeGroups(ly, L.groups || []); break;
      case 'image': case 'audio': case 'footage':
        ly = comp.layers.add(ctx.items[L.asset]); break;
      case 'precomp': ly = comp.layers.add(ctx.comps[L.comp]); break;
      default: throw new Error('unknown layer type ' + L.type);
    }
    if (L.name) ly.name = L.name;
    if (L.type === 'shape' || L.type === 'null') { // layer space = parent space
      ly.property('ADBE Transform Group').property('ADBE Anchor Point').setValue([0, 0]);
      ly.property('ADBE Transform Group').property('ADBE Position').setValue([0, 0]);
    }
    if (L.type === 'image' && L.width && !(L.transform && L.transform.scale)) {
      var it = ctx.items[L.asset];
      ly.property('ADBE Transform Group').property('ADBE Scale').setValue([100 * L.width / it.width, 100 * (L.height || L.width * it.height / it.width) / it.height]);
    }
    return ly;
  }

  function finishLayer(comp, ly, L, ctx) {
    var T = L.transform || {}, tg = ly.property('ADBE Transform Group');
    setProp(tg.property('ADBE Anchor Point'), T.anchor);
    setProp(tg.property('ADBE Position'), T.position);
    setProp(tg.property('ADBE Scale'), T.scale);
    setProp(tg.property('ADBE Rotate Z'), T.rotation);
    setProp(tg.property('ADBE Opacity'), T.opacity);
    if (L.expr) for (var pn in L.expr) if (L.expr.hasOwnProperty(pn)) tg.property(pn).expression = L.expr[pn];
    if (L.masks) addMasks(ly, L.masks);
    if (L.effects) addEffects(ly, L.effects);
    if (L.type === 'text' && L.reveal) wordReveal(comp, ly, L);
    if (L.type === 'audio' && L.level !== undefined) ly.property('ADBE Audio Group').property('ADBE Audio Levels').setValue([L.level, L.level]);
    if (L.blend && BLEND[L.blend]) ly.blendingMode = BlendingMode[BLEND[L.blend]];
    if (L.motionBlur) ly.motionBlur = true;
    if (L.collapse) ly.collapseTransformation = true;
    if (L.preserveTransparency) ly.preserveTransparency = true;
    if (L.label !== undefined) ly.label = L.label;
    if (L.inPoint !== undefined) ly.inPoint = L.inPoint;
    if (L.outPoint !== undefined) ly.outPoint = L.outPoint;
    if (L.comment) ly.comment = L.comment;
    if (L.shy) ly.shy = true;
    if (L.guide) ly.guideLayer = true;
    if (L.enabled === false) ly.enabled = false;
    if (L.locked) ly.locked = true;
  }

  function buildComp(C, ctx) {
    var comp = ctx.comps[C.id], byId = {}, made = [], i;
    // spec lists layers bottom -> top; AE adds new layers on top
    for (i = 0; i < C.layers.length; i++) {
      var L = C.layers[i];
      try { var ly = createLayer(comp, L, ctx); byId[L.id || ('#' + i)] = ly; made.push([ly, L]); }
      catch (e) { log('layer FAILED ' + (L.name || L.id) + ' in ' + C.name + ': ' + e.toString() + ' (line ' + e.line + ')'); }
    }
    for (i = 0; i < made.length; i++) { // parent first, so transforms are authored in parent space
      var P = made[i][1].parent;
      if (P) { if (byId[P]) made[i][0].setParentWithJump(byId[P]); else log('missing parent ' + P); }
    }
    for (i = 0; i < made.length; i++) {
      try { finishLayer(comp, made[i][0], made[i][1], ctx); }
      catch (e3) { log('layer setup FAILED ' + made[i][0].name + ': ' + e3.toString() + ' (line ' + e3.line + ')'); }
    }
    for (i = 0; i < made.length; i++) { // track mattes, after every layer exists
      var MT = made[i][1].matte;
      if (!MT) continue;
      var type = pick({ alpha: TrackMatteType.ALPHA, 'alpha-inverted': TrackMatteType.ALPHA_INVERTED, luma: TrackMatteType.LUMA, 'luma-inverted': TrackMatteType.LUMA_INVERTED }, MT.type, TrackMatteType.ALPHA);
      try { made[i][0].setTrackMatte(byId[MT.layer], type); } catch (e4) { log('matte failed on ' + made[i][0].name + ': ' + e4); }
    }
    if (C.markers) for (i = 0; i < C.markers.length; i++) {
      var mv = new MarkerValue(C.markers[i].text); if (C.markers[i].dur) mv.duration = C.markers[i].dur;
      comp.markerProperty.setValueAtTime(C.markers[i].t, mv);
    }
    return comp;
  }

  // ---------------------------------------------------------------- build
  // relative paths resolve against the folder build.jsx runs from (portable builds)
  function resolvePath(p) {
    if (/^(\/|[A-Za-z]:[\\\/]|~)/.test(p)) return p;
    var base = new File($.fileName).parent.fsName;
    return base + '/' + p;
  }

  function build(S) {
    S.project.output = resolvePath(S.project.output);
    // never throw away someone's work: refuse if the open project has unsaved changes
    // (an empty untitled project counts as dirty in AE, but there is nothing in it to lose)
    // (rebuilding the very project this script writes is fine: it gets overwritten anyway)
    var sameFile = app.project && app.project.file && app.project.file.fsName === new File(S.project.output).fsName;
    var hasWork = app.project && app.project.dirty && !sameFile && (app.project.file !== null || app.project.numItems > 0);
    if (hasWork && !S.project.discardUnsaved) {
      var msg = 'Build stopped: the open After Effects project' + (app.project.file ? ' (' + app.project.file.fsName + ')' : '') + ' has unsaved changes. Save or close it, then run this script again.';
      var rf = new File(S.project.output.replace(/\.aep$/, '') + '.build-log.txt');
      try { rf.encoding = 'UTF-8'; rf.lineFeed = 'Unix'; rf.open('w'); rf.write('stills: 0\nissues: 1\n' + msg + '\n'); rf.close(); } catch (eW) {}
      if (!S.project.quiet) alert(msg); // automated runs (make_jsx --quiet) must not block AE with a dialog
      return -1;
    }
    app.beginSuppressDialogs();
    if (S.project.stillsDir) { S.project.stillsDir = resolvePath(S.project.stillsDir); new Folder(S.project.stillsDir).create(); }
    for (var a = 0; a < S.assets.length; a++) S.assets[a].path = resolvePath(S.assets[a].path);
    var t0 = new Date().getTime();
    app.newProject();
    var proj = app.project, ctx = { items: {}, comps: {} }, i;
    proj.bitsPerChannel = S.project.bitsPerChannel || 16;
    var fAssets = proj.items.addFolder('Assets'), fComps = proj.items.addFolder('Precomps');
    for (i = 0; i < S.assets.length; i++) {
      var A = S.assets[i];
      try { var it = proj.importFile(new ImportOptions(new File(A.path))); it.parentFolder = fAssets; if (A.name) it.name = A.name;
        // AE guesses non-square pixels for some sizes (e.g. 720x480, 960x720): stills from code are always square
        try { if (it.mainSource && it.mainSource.isStill !== undefined && it.width > 0) it.pixelAspect = 1; } catch (ePA) {}
        ctx.items[A.id] = it; }
      catch (e) { log('import FAILED ' + A.path + ': ' + e); }
    }
    for (i = 0; i < S.comps.length; i++) {
      var C = S.comps[i];
      var comp = proj.items.addComp(C.name, Math.round(C.width), Math.round(C.height), 1, C.duration, C.fps);
      if (C.bg) comp.bgColor = col(C.bg);
      if (!C.main) comp.parentFolder = fComps;
      if (C.motionBlur) { comp.motionBlur = true; comp.shutterAngle = C.motionBlur.shutter || 180; comp.shutterPhase = -(C.motionBlur.shutter || 180) / 2; }
      ctx.comps[C.id] = comp;
    }
    var main = null;
    for (i = 0; i < S.comps.length; i++) { var c = buildComp(S.comps[i], ctx); if (S.comps[i].main) main = c; }
    if (main) { main.openInViewer(); }
    var stills = [];
    if (main && S.project.stills) for (i = 0; i < S.project.stills.length; i++) {
      var f = new File(S.project.stillsDir + '/ae_t' + S.project.stills[i].toFixed(2) + '.png');
      try { main.saveFrameToPng(S.project.stills[i], f); stills.push(f.fsName); } catch (e5) { log('still failed: ' + e5); }
    }
    proj.save(new File(S.project.output));
    var report = new File(S.project.output.replace(/\.aep$/, '') + '.build-log.txt');
    report.encoding = 'UTF-8'; report.lineFeed = 'Unix'; report.open('w');
    report.write('built in ' + ((new Date().getTime() - t0) / 1000) + 's\ncomps: ' + S.comps.length + '\nstills: ' + stills.length + '\nissues: ' + LOG.length + '\n' + LOG.join('\n') + '\n');
    report.close();
    app.endSuppressDialogs(false);
    return LOG.length;
  }

  return { build: build };
})();
