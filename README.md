0x88.js
=======

0x88.js is a JavaScript chess board library. It takes care of:

 * Board and piece representation
 * Importing and exporting board states to FEN notation
 * Move validation

Basic usage
-----------

    var fen = 'rnbqkbnr/pp1ppppp/8/2p5/4P3/8/PPPP1PPP/RNBQKBNR w KQkq e3 0 2'
      , board = new Board(fen)
      , piece = board.pieces['q'];
    
    // Get color of piece (black queen)
    board.get_color(piece);
    
    // Get fen notation for current board state
    board.from_fen();

It is very much work in progress at the moment, more features will be added
soon.

