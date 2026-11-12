(function () {
  'use strict';
  var game = new Chess();
  var flipped = false, selected = null, lastMove = null, bestMove = null, lines = {}, searching = false, searchFen = null;
  var $ = function (id) { return document.getElementById(id); };
  var boardEl = $('board'), statusEl = $('status'), linesEl = $('lines'), fenEl = $('fen');

  // Engine: WebAssembly build when available, asm.js fallback otherwise.
  var wasm = typeof WebAssembly === 'object' && typeof WebAssembly.instantiate === 'function';
  var engine = new Worker(wasm ? 'vendor/stockfish.wasm.js' : 'vendor/stockfish.js');
  var ready = false;
  engine.onmessage = function (e) { onEngine(String(e.data || e)); };
  engine.postMessage('uci');
  engine.postMessage('setoption name MultiPV value 3');
  engine.postMessage('isready');

  function onEngine(line) {
    if (line === 'readyok') { ready = true; if (!searching) statusEl.textContent = 'Engine ready (Stockfish 10).'; return; }
    if (line.indexOf('info ') === 0 && line.indexOf(' pv ') > 0 && searching) {
      var depth = +(line.match(/ depth (\d+)/) || [])[1];
      var mpv = +((line.match(/ multipv (\d+)/) || [0, 1])[1]);
      var cp = line.match(/ score cp (-?\d+)/), mate = line.match(/ score mate (-?\d+)/);
      var pv = line.split(' pv ')[1].trim().split(' ');
      lines[mpv] = { depth: depth, cp: cp ? +cp[1] : null, mate: mate ? +mate[1] : null, pv: pv };
      statusEl.textContent = 'Searching… depth ' + depth;
      renderLines();
      return;
    }
    if (line.indexOf('bestmove') === 0 && searching) {
      searching = false;
      var bm = line.split(' ')[1];
      bestMove = bm && bm !== '(none)' ? { from: bm.slice(0, 2), to: bm.slice(2, 4), promotion: bm[4] } : null;
      statusEl.textContent = bestMove ? 'Done. Best move highlighted in blue.' : 'No legal moves in this position.';
      $('btnPlay').disabled = !bestMove;
      $('btnCalc').disabled = false;
      renderBoard();
    }
  }

  function toSan(fen, uciMoves, max) {
    var g = new Chess(fen), out = [];
    for (var i = 0; i < uciMoves.length && i < max; i++) {
      var u = uciMoves[i], m = g.move({ from: u.slice(0, 2), to: u.slice(2, 4), promotion: u[4] || 'q' });
      if (!m) break;
      out.push(m.san);
    }
    return out;
  }

  function evalText(l, whiteToMove) {
    if (l.mate !== null) { var m = whiteToMove ? l.mate : -l.mate; return (m > 0 ? '+M' : '-M') + Math.abs(m); }
    var v = (whiteToMove ? l.cp : -l.cp) / 100;
    return (v > 0 ? '+' : '') + v.toFixed(2);
  }

  function renderLines() {
    var fen = searchFen || game.fen(), whiteToMove = fen.split(' ')[1] === 'w', html = '';
    Object.keys(lines).sort().forEach(function (k) {
      var l = lines[k], san = toSan(fen, l.pv, 8);
      if (!san.length) return;
      html += '<li><span class="ev">' + evalText(l, whiteToMove) + '</span> <strong>' + san[0] + '</strong> <span class="pv">' + san.slice(1).join(' ') + '</span></li>';
    });
    linesEl.innerHTML = html;
  }

  function squareName(file, rank) { return 'abcdefgh'[file] + (rank + 1); }

  function renderBoard() {
    boardEl.innerHTML = '';
    for (var r = 7; r >= 0; r--) {
      for (var f = 0; f < 8; f++) {
        var file = flipped ? 7 - f : f, rank = flipped ? 7 - r : r, name = squareName(file, rank);
        var div = document.createElement('div');
        div.className = 'sq ' + ((file + rank) % 2 ? 'l' : 'd');
        if (lastMove && (name === lastMove.from || name === lastMove.to)) div.className += ' last';
        if (bestMove && (name === bestMove.from || name === bestMove.to)) div.className += ' best';
        if (selected === name) div.className += ' sel';
        var p = game.get(name);
        if (p) div.innerHTML = '<img class="pc" src="assets/pieces/' + p.color + p.type.toUpperCase() + '.svg" alt="" draggable="false">';
        if (f === 0) div.innerHTML += '<span class="c">' + (rank + 1) + '</span>';
        div.dataset.sq = name;
        div.setAttribute('role', 'button');
        div.setAttribute('aria-label', name + (p ? ' ' + (p.color === 'w' ? 'white ' : 'black ') + p.type : ''));
        boardEl.appendChild(div);
      }
    }
    fenEl.value = game.fen();
  }

  function clearAnalysis() {
    if (searching) engine.postMessage('stop');
    searching = false; lines = {}; bestMove = null; linesEl.innerHTML = '';
    $('btnPlay').disabled = true; $('btnCalc').disabled = false;
    statusEl.textContent = ready ? 'Engine ready (Stockfish 10).' : 'Engine loading…';
  }

  boardEl.addEventListener('click', function (e) {
    var t = e.target.closest('.sq'); if (!t) return;
    var sq = t.dataset.sq, p = game.get(sq);
    if (selected) {
      var m = game.move({ from: selected, to: sq, promotion: 'q' });
      if (m) { lastMove = { from: m.from, to: m.to }; selected = null; clearAnalysis(); renderBoard(); return; }
    }
    selected = p && p.color === game.turn() ? sq : null;
    renderBoard();
  });

  $('btnCalc').addEventListener('click', function () {
    if (game.game_over()) { statusEl.textContent = 'The game is over in this position.'; return; }
    clearAnalysis();
    searching = true; searchFen = game.fen();
    $('btnCalc').disabled = true;
    statusEl.textContent = 'Searching…';
    engine.postMessage('ucinewgame');
    engine.postMessage('position fen ' + searchFen);
    engine.postMessage('go depth ' + $('depth').value);
  });
  $('btnPlay').addEventListener('click', function () {
    if (!bestMove) return;
    var m = game.move({ from: bestMove.from, to: bestMove.to, promotion: bestMove.promotion || 'q' });
    if (m) lastMove = { from: m.from, to: m.to };
    clearAnalysis(); renderBoard();
  });
  $('btnUndo').addEventListener('click', function () { game.undo(); lastMove = null; selected = null; clearAnalysis(); renderBoard(); });
  $('btnFlip').addEventListener('click', function () { flipped = !flipped; renderBoard(); });
  $('btnReset').addEventListener('click', function () { game.reset(); lastMove = null; selected = null; clearAnalysis(); renderBoard(); });
  $('btnFen').addEventListener('click', function () {
    var fen = fenEl.value.trim(), v = game.validate_fen(fen);
    if (!v.valid) { statusEl.textContent = 'That FEN is not valid: ' + v.error; return; }
    game.load(fen); lastMove = null; selected = null; clearAnalysis(); renderBoard();
  });

  renderBoard();
})();
