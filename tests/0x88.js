module('FEN Notation');

var start_fen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
var fen = 'rnbqkbnr/ppp1pppp/8/3p4/4P3/8/PPPP1PPP/RNBQKBNR w KQkq e3 0 2';

test('Correctly imports FEN string and populates board', function() {
    var board = new Board(fen)
      , invalid_fen = '8/8/8/8/8/8 b - - 0 60';

    equal(board.positions[0], board.pieces['R']);
    equal(board.positions[0x77], board.pieces['r']);
    equal(board.turn, board.WHITE);
    equal(board.half_moves, 0);
    equal(board.full_moves, 2);

    // raises(board.load(invalid_fen),
    //        'Invalid fen file must throw an exception');
});

test('Correctly exports FEN string', function() {
    var board = new Board(fen)

    equal(board.fen(), fen);
});

test('Test Board::reset', function() {
    var board = new Board(fen)
    board.reset();

    equal(board.turn, board.WHITE);
    equal(board.castling, 0x0F);
    equal(board.en_passant, null);
    equal(board.half_moves, 0);
    equal(board.full_moves, 0);
});

test('Test Board::position_piece', function() {
    var board = new Board()
      , piece = board.pieces['p']
      , index = 0x60;

    board.position_piece(piece, index); // Move leftmost black pawn forwards
    equal(board.positions[index], piece);
});

module('Internal functions');

test('Test Board::get_index', function() {
    var board = new Board();

    equal(board.get_index(2, 4), 0x24); // e3
    equal(board.get_index('g7'), 0x66); // h8
});

test('Test Board::has_index', function() {
    var board = new Board();

    equal(board.has_index(0x00), true); // a1
    equal(board.has_index(0x77), true); // h8
    equal(board.has_index(0x88), false); // invalid
});

test('Test Board::get_san', function() {
    var board = new Board();

    equal(board.get_san(0x11), 'b2');
    equal(board.get_san(0x77), 'h8');
});


test('Test Board::get_color', function() {
    var board = new Board();

    equal(board.get_color(0x20), board.BLACK); // Black queen
    equal(board.get_color(0x81), board.WHITE); // White pawn
});

test('Test Board::get_piece', function() {
    var board = new Board();

    equal(board.get_piece(0x20), 'q'); // Black queen
});

test('Test Board::piece_at', function() {
    var board = new Board(fen);

    equal(board.piece_at(0x76), 0x02); // Black Rook
    equal(board.piece_at(0x07), 0x90); // White Rook
});

module('Move generation');

test('Test Board::pawn_moves', function() {
    var board = new Board(fen);

    // White pieces (moving upwards)
    equal(board.pawn_moves(0x10, board.turn).length, 2);
    equal(board.pawn_moves(0x34, board.turn).length, 2);

    //Black pieces (moving backwards)
    board.turn = board.BLACK;
    equal(board.pawn_moves(0x43, board.turn).length, 2);
    equal(board.pawn_moves(0x60, board.turn).length, 2);

    // Test en passant move is detected
    var en_passant = 'rnbqkbnr/1pp1pppp/8/p2pP3/8/8/PPPP1PPP/RNBQKBNR w KQkq d5 0 2';
    board = new Board(en_passant);
    equal(board.pawn_moves(0x44, board.turn).length, 2);

});

test('Test Board::move_generator', function() {
    // We'll test the usage with a queen move as an example
    var board = new Board('2k5/8/8/2b5/3QB2K/8/8/6R1 w - - 0 100');
    // White piece (moving upwards)
    equal(board.move_generator(0x33, board.offsets['Q'],
          board.turn, false).length, 20);
});

test('Test Board::valid_knight_moves', function() {
    var board = new Board(fen);

    // White pieces (moving upwards)
    equal(board.piece_moves('N', 0x01, board.turn).length, 2);
});

test('Test Board::valid_rook_moves', function() {
    var board = new Board('r6r/1k6/8/8/3K4/8/8/R6R w - - 0 100');
    // White pieces (moving upwards)
    equal(board.piece_moves('R', 0x77, board.turn).length, 13);
});

test('Test Board::valid_bishop_moves', function() {
    var board = new Board('r6r/2k5/8/3B4/3K4/8/8/8 w - - 0 100');
    // White pieces (moving upwards)
    equal(board.piece_moves('B', 0x43, board.turn).length, 13);
});

test('Test Board::is_attacked', function() {
    var board = new Board('1k5r/8/6N1/2b2p2/3Qb2K/8/8/1R6 b - - 0 100');

    equal(board.turn, board.BLACK);
    // Ray sliding attack

    equal(board.is_attacked('C5'), true);
    // Rank sliding attack
    equal(board.is_attacked(7, 1), true);
    // Pawn attack
    equal(board.is_attacked(0x34), true);
    // Knight attack
    equal(board.is_attacked(0x77), true);
});

test('Test Board::moves', function() {
    // 20 legal moves at the start
    var board = new Board(start_fen);
    equal(board.moves().length, 20)

    // 2 of the possble 8 king moves should result in check
    board = new Board('k7/2K5/8/8/8/8/8/8 w - - 0 100');
    equal(board.moves().length, 6);

    // Check mate (no possible moves)
    board = new Board('k6R/2K5/8/8/8/8/8/6B1 b - - 0 100');
    equal(board.moves().length, 0);

    // Stale mate (king not in check, but no possble legal moves)
    board = new Board('k7/2K5/8/8/8/8/8/6B1 b - - 0 100');
    equal(board.moves().length, 0);
});

