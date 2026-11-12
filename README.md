# Best Chess Move Calculator

A free chess move calculator that runs Stockfish 10 (WebAssembly) entirely in your browser and shows the top three moves with evaluations and the expected line.

**Live version:** https://bestchessmovecalculator.com/

## Features

- Stockfish 10 in a Web Worker (WebAssembly, asm.js fallback for old browsers)
- Top three lines (MultiPV 3) with evaluation from White's side and the principal variation in SAN
- Click-to-move board with legal-move checking by chess.js
- FEN input, undo, flip, play the best move
- Nothing leaves your device: no server, no tracking

## Run it locally

The engine runs in a Web Worker, so open the page through a local web server rather than as a file:

```bash
python3 -m http.server 8000
# then open http://localhost:8000/
```

## How it works

The board and move legality come from chess.js. The engine is the Stockfish 10 build from stockfish.js, loaded as a Web Worker and driven
over the UCI protocol (`uci`, `setoption name MultiPV value 3`, `position fen ...`, `go depth N`). The `info ... multipv N score ... pv ...`
lines are parsed and converted to SAN for display. Evaluations are shown from White's point of view.

## Fair play

This tool is for studying positions and reviewing finished games. Using any engine during a game against another person breaks the
fair-play rules of Chess.com, Lichess, FIDE and US Chess.

For engine suggestions pitched at your own rating while you study your Chess.com and Lichess games, see
[ChessHelper (chesshelper.ai)](https://chesshelper.ai/), which is made by the same team.

## Licenses

- Code in this repository: GPL-3.0 (it bundles Stockfish).
- Stockfish 10 via stockfish.js: GPL-3.0, see `vendor/stockfish-COPYING-GPLv3.txt` and https://github.com/nmrugg/stockfish.js
- chess.js 0.10.3: BSD-2-Clause, see `vendor/chess.js-LICENSE.txt`
- Piece images: cburnett (Colin M.L. Burnett, GPLv2+)
