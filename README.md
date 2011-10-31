0x88.js
=======

0x88.js is a JavaScript chess board library. It takes care of:

 * Board and piece representation
 * Importing and exporting board states to [FEN](http://en.wikipedia.org/wiki/Forsyth%E2%80%93Edwards_Notation) notation
 * Move validation
 * Board history and state


Basic usage
-----------

    > var fen = 'rnbqkbnr/pp1ppppp/8/2p5/4P3/8/PPPP1PPP/RNBQKBNR w KQkq e3 0 2'
    >   , board = new Board(fen);
    
    // How many moves are possible for current 
    > var moves = board.moves();
    > moves.length
    30
    
    // Let's make a move (we'll choos the first move in the moves array)
    > move moves[0]
    > board.do(move);
       + ------------------------ +
    8  |  r  n  b  q  k  b  n  r  |
    7  |  p  p  .  p  p  p  p  p  |
    6  |  .  .  .  .  .  .  .  .  |
    5  |  .  .  p  .  .  .  .  .  |
    4  |  .  .  .  .  P  .  .  .  |
    3  |  N  .  .  .  .  .  .  .  |
    2  |  P  P  P  P  .  P  P  P  |
    1  |  R  .  B  Q  K  B  N  R  |
    *  + ------------------------ +
          A  B  C  D  E  F  G  H  
    
    // Maybe not the best move - let's undo it
    > board.undo();
    > board.toString();
       + ------------------------ +
    8  |  r  n  b  q  k  b  n  r  |
    7  |  p  p  .  p  p  p  p  p  |
    6  |  .  .  .  .  .  .  .  .  |
    5  |  .  .  p  .  .  .  .  .  |
    4  |  .  .  .  .  P  .  .  .  |
    3  |  .  .  .  .  .  .  .  .  |
    2  |  P  P  P  P  .  P  P  P  |
    1  |  R  N  B  Q  K  B  N  R  |
    *  + ------------------------ +
          A  B  C  D  E  F  G  H  
    
    > board.fen();
    'rnbqkbnr/pp1ppppp/8/2p5/4P3/8/PPPP1PPP/RNBQKBNR w KQkq e3 0 2'


Tests
-----

### Unit Tests

0x88.js has a suite of unit tests written using [qUnit](http://docs.jquery.com/Qunit). You can run the test suite in the browser at `./tests/index.html`


### Performance Tests (perft & divide)

    // count number of move possible from this position at depth `n`
    > var fen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
    > board.perft(1);
    20
    > board.perft(2);
    400
    > board.perft(3);
    8902
    > board.perft(4);
    197281
    


### Notes

It is very much work in progress at the moment, more features will be added
soon!


### Licence

Licensed for use under [Attribution 3.0 unported](http://creativecommons.org/licenses/by/3.0/).
