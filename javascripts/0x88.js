(function() {
/**
 * Chess Board Representation with move generation and fen import / export.
 *
 * @param {str} FEN
 * @todo Add Castling moves / history / game state / promotion
 * @todo Make methods more 'restful'
 * @todo Refactor into public / private methods
 */
var Board = function (fen) {

    this.bitboards = {
        K: new BitBoard(0x00000000, 0x00000010),
        Q: new BitBoard(0x00000000, 0x00000008),
        R: new BitBoard(0x00000000, 0x00000081),
        B: new BitBoard(0x00000000, 0x00000024),
        N: new BitBoard(0x00000000, 0x00000042),
        P: new BitBoard(0x00000000, 0x0000FF00),
        k: new BitBoard(0x04000000, 0x00000000),
        q: new BitBoard(0x08000000, 0x00000000),
        r: new BitBoard(0x81000000, 0x00000000),
        b: new BitBoard(0x24000000, 0x00000000),
        n: new BitBoard(0x42000000, 0x00000000),
        p: new BitBoard(0x00FF0000, 0x00000000)
    }
    this.bitboards.WHITE = this.bitboards['K']
                       .or(this.bitboards['Q'])
                       .or(this.bitboards['R'])
                       .or(this.bitboards['B'])
                       .or(this.bitboards['N'])
                       .or(this.bitboards['P']);

    this.bitboards.BLACK = this.bitboards['k']
                       .or(this.bitboards['q'])
                       .or(this.bitboards['r'])
                       .or(this.bitboards['b'])
                       .or(this.bitboards['n'])
                       .or(this.bitboards['p']);

    this.BLACK = 0x00;
    this.WHITE = 0x80;

    // blank 0x88 array of board positions
    this.positions = new Array(128);

    this.turn = this.WHITE;

    // Castling
    this.B_00 = Math.pow(2, 0);
    this.B_000 = Math.pow(2, 1);
    this.W_00 = Math.pow(2, 2);
    this.W_000 = Math.pow(2, 3);
    this.castling = this.B_00 | this.B_000 | this.W_00 | this.W_000;
    this.castling_map = {
      'K': this.W_00,
      'Q': this.W_000,
      'k': this.B_00,
      'q': this.B_000}

    this.en_passant = null;

    this.half_moves = 0;
    this.full_moves = 0;

    var rank_file = [-1, -16, 1, 16]
      , diagonal = [-15, -17, 15, 17];
    this.offsets = {
        'R': rank_file,
        'N': [31, 33, 14, 18, -18, -14, -33, -31],
        'B': diagonal,
        'Q': rank_file.concat(diagonal),
        'K': rank_file.concat(diagonal)}

    // Black pieces are lowercase, white pieces uppercase
    this.pieces = {
        p: 0x01,
        n: 0x02,
        k: 0x04,
        b: 0x08,
        r: 0x10,
        q: 0x20,
        P: 0x81,
        N: 0x82,
        K: 0x84,
        B: 0x88,
        R: 0x90,
        Q: 0xA0
    };

    this.GAME_OVER = 0;
    this.ACTIVE = 1;
    this.CHECK_MATE = 2;
    this.STALE_MATE = 4;
    this.flags = {
        EN_PASSANT: 0x00,
        CASTLE: 0x02
    };

    this.history = [];

    if (fen) {
        this.load(fen);
    }
    return this;
};

Board.prototype.perft = function (depth) {
    // var start = +new Date()
    var moves = this.moves()
      , nodes = 0;

    if (depth === 1) {
        return moves.length;
    }

    for (var i = 0, l = moves.length; i < l; i++) {
        this.do(moves[i]);
        nodes += this.perft(depth - 1);
        this.undo();
    }
    return nodes;
    // return {'nodes': nodes, 'seconds': ((+new Date() - start) / 1000)};
}

Board.prototype.divide = function (depth) {
    var results = {}, moves = this.moves();

    for (var i = 0, l = moves.length; i < l; i++) {
        this.do(moves[i]);
        results[moves[i].san()] = this.perft(depth - 1);
        this.undo();
    }
    return {'results': results, 'moves': i};
}

/**
 * State of Game (Active or Game Over)
 * @return {obj} State object
 * @todo Add check mate detection
 */
Board.prototype.state = function () {
    var code, reason, winner
      , move_count = this.moves().length;

    if (move_count) {
        code = this.ACTIVE;
    } else {
        reason = true /*KING IN CHECK*/ ? this.CHECK_MATE : this.STALE_MATE;
        code = this.GAME_OVER;
        winner = this.turn ^ 0x80;
    }
    return {
        code: code,
        reason: reason,
        winner: winner}
}

/**
 * Push current board state into history
 * @param {obj} Move object
 * @return {int} - board state
 */
Board.prototype.do = function (move) {
    if (this.state().code !== this.ACTIVE) {
        throw new Error('Game Over');
    }
    this.history.push({
        move: move,
        turn: this.turn,
        positions: [].concat(this.positions), // Quick copy
        castling: this.castling,
        en_passant: this.en_passant,
        full_moves: this.full_moves,
        half_moves: this.half_moves,
    });

    move.do(this);
    if (this.turn === this.BLACK) {
        this.full_moves++;
    }
    this.turn ^= 0x80;

    return this.state();
}

Board.prototype.undo = function () {
    if (! this.history.length) {
        throw new Error('There are no previous states to rollback to');
    }
    var state = this.history.pop();
    this.turn = state.turn;
    this.positions = [].concat(state.positions); // Quick copy
    this.castling = state.castling;
    this.en_passant = state.en_passant;
    this.full_moves = state.full_moves;
    this.half_moves = state.half_moves;
}

/**
 * 8x8 Two-dimensional array board representation
 * @return {array}
 */
Board.prototype.array = function (flat) {
    var board = []
      , row
      , index
      , hex;

    for (var rank = 7; rank >= 0; rank--) {
        row = [];
        for (var file = 0; file < 8; file++) {
            index = this.get_index(rank, file);
            hex = this.piece_at(index);
            row.push(this.get_piece(hex));
        }
        board.push(row);
    }
    if (flat) {
        return board.reduce(function (a, b) {
            return a.concat(b);
        });
    }
    return board;
}

/**
 * ASCII Board representation
 * @return {str}
 */
Board.prototype.toString = function () {
    var border = '  + ------------------------ +'
      , ascii = ['', [this.turn === this.BLACK ? '*' : ' ', border].join('')]
      , board = this.array();

    for (var i = 0; i < 8; i++) {
        row = [8 - i, '|'].concat(board[i].map(function (position) {
            return position ? position : '.';
        }));
        row.push('|');
        ascii.push(row.join('  '));
    }

    ascii.push([this.turn === this.WHITE ? '*' : ' ', border].join(''),
               '  ABCDEFGH\n'.split('').join('  '));
    return ascii.join('\n');
}

/**
 * Reset board and load game in from FEN notation
 * @param {str} FEN string
 */
Board.prototype.load = function (fen) {
    var parts = fen.split(' ')
      , board = parts[0].split('/').reverse()
      , castling = parts[2]
      , en_passant = parts[3]
      , row = 0, rank, col, bit;

    this.reset();
    // Basic validation
    if (!parts.length === 6 || !board.length === 8) {
        throw new Error('Not a valid femfile');
    }

    for (; row < board.length; row++) {
        col = 0, rank = board[row].split('');
        for (var i in rank) {
            bit = rank[i];
            if ('12345678'.indexOf(bit) > -1) {
                col += parseInt(bit);
            } else if (bit in this.pieces) {
                this.position_piece(this.pieces[bit],
                                    this.get_index(row, col));
                col++;
            }
        }
    }

    this.turn = parts[1].toLowerCase() === 'w' ? this.WHITE : this.BLACK;

    this.castling = 0;
    for (var key in this.castling_map) {
        if (castling.indexOf(key) !== -1) {
            this.castling = this.castling | this.castling_map[key];
        }
    }

    this.en_passant = en_passant === '-' ? false : this.get_index(en_passant);
    this.half_moves = parseInt(parts[4]);
    this.full_moves = parseInt(parts[5]);
}

/**
 * Return board / game representation as a fen string
 * @return {str}
 */
Board.prototype.fen = function() {
    var empty, key, castling = '', rows = [];

    this.array().forEach(function (row) {
        empty = ! row[0] ? 1 : 0;

        rows.push(row.reduce(function (a, b) {
            a = a ? a : '';
            if (b) {
                if (empty) {
                    a += empty.toString();
                    empty = 0;
                }
                a += b;
            } else {
                empty++;
            }
            return a;
        }).concat(empty ? empty.toString() : ''));
    });

    for (key in this.castling_map) {
        if (this.castling & this.castling_map[key]) {
            castling += key;
        }
    }

    return [
        rows.join('/'),
        this.turn === this.WHITE ? 'w' : 'b',
        castling || '-',
        this.get_san(this.en_passant) || '-',
        this.half_moves, this.full_moves
    ].join(' ');
}

/**
 * @return {void}
 */
Board.prototype.reset = function () {
    this.positions = new Array(128);
    this.turn = this.WHITE;
    this.castling = this.B_00 | this.B_000 | this.W_00 | this.W_000;
    this.en_passant = null;
    this.half_moves = 0;
    this.full_moves = 0;
}

Board.prototype.position_piece = function (piece, index) {
    this.positions[index] = piece;
}

/**
 * Get 0x88 position index of a row and column
 * @param {int} row (0 indexed)
 * @param {int} column (0 indexed)
 * @return {int} [0-127]
 */
Board.prototype.get_index = function (row, column) {
    var san; // standard algebraic notation
    if (typeof row === 'string') {
        san = row.split('');
        row = san[1] - 1;
        column = 'abcdefgh'.indexOf(san[0].toLowerCase())
    }
    return row << 4 | column;
};

/**
 * @param {int} 0x88 index
 * @return {str} standard algebraic notation
 */
Board.prototype.get_san = function (index) {
    var file = (index & 7), rank = (index >> 4) + 1;
    if (this.has_index(index)) {
        return 'abcdefgh'.charAt(file).concat(rank.toString());
    }
}

/**
 * Get color of a piece
 * @param {int} Hex representation of a piece
 * return {int} WHITE or BLACK
 */
Board.prototype.get_color = function (piece) {
    if (piece) {
        return piece & 0x80;
    }
    return undefined;
}

/**
 * Get piece name from it's hex represention
 * @param {int}
 * @return {str|null}
 */
Board.prototype.get_piece = function (code) {
    var key, piece;
    for (key in this.pieces) {
        piece = this.pieces[key];
        if (piece === code) {
            return key;
        }
    }
    return undefined;
}

/**
 * @param {int} Possible board position index
 * @return {bool}
 */
Board.prototype.has_index = function (index) {
    return !Boolean(index & 0x88);
}

/**
 * @param {int|str} Piece 0x88 / san position
 * @return {int} Piece hex representation
 */
Board.prototype.piece_at = function (index) {
    if (typeof index === 'string') {
        index = this.get_index(index);
    }
    return this.positions[index];
}

/**
 * Check if a piece at specified position can be taken by an opponents piece
 * @param {int|string} index
 * @param {int} (optional) column - if specified, index and column will be
 *     treated at row and column respectfully
 * @return {bool}
 * @todo refactor index code/ move to another function
 */
Board.prototype.is_attacked = function (index, column) {
    var index, piece, moves;

    if (typeof index === 'string') {
        index = this.get_index(index);
    } else if (typeof index === 'number' && typeof column === 'number') {
        index = this.get_index(index, column);
    }

    piece = this.piece_at(index);
    moves = this.moves(this.get_color(piece) ^ 0x80, true)
    if (! moves) {
        return false;
    }
    return moves.some(function (move) {
        return  move.to === index;
    });
}

/**
 * Generate list of valid moves
 * @param {int} (this.WHITE or this.BLACK) player to generate moves for
 * @param {bool} Psuedo-legal moves or legal (king not in check) moves
 * @return {array} - List of Move objects
 */
Board.prototype.moves = function (player, psuedo_legal) {
    var code, piece, generator, king, in_check
      , board = this
      , moves = [];

    player = player !== undefined ? player : this.turn;
    for (var i = 0, l = this.positions.length; i < l; i++) {
        // Check square is on the board
        if (! this.has_index(i)) {
            i += 7;
            continue;
        }

        code = this.positions[i];
        // Check square contains current player's piece
        if (code && this.get_color(code) === player) {
            piece = this.get_piece(code).toUpperCase();
            // Save king position for check test
            if (piece === 'K') {
                king = i;
            }
            moves = moves.concat(this.piece_moves(piece, i, player));
        }
    }

    if (psuedo_legal === true || moves.length < 1) {
        return moves;
    }

    // Legal moves (check for check!)
    return moves.filter(function (move) {
        move.do(board);
        if ((move.piece & 0x3F) === board.pieces['k']) {
            in_check = board.is_attacked(move.to);
        } else {
            in_check = board.is_attacked(king);
        }
        move.undo(board);

        if (! in_check) {
            return move;
        }
    });
}

/**
 * @param {str}
 * @param {int}
 * @param {int}
 */
Board.prototype.piece_moves = function (piece, index, player) {
    var single = (piece === 'K' || piece === 'N')
      , offset = this.offsets[piece];

    if (piece === 'P') {
        return this.pawn_moves(index, player);
    }
    return this.move_generator(index, offset, player, single)
}

/**
 * @param {int} index of piece
 * @param {int} (this.WHITE or this.BLACK)
 * @return {array} List of valid moves
 * @todo Add promotion rules
 */
Board.prototype.pawn_moves = function (index, player) {
    var to, piece, flag
      , direction = player === this.WHITE ? 16 : -16
      , forward = index + direction
      , moves = []
      , board = this
      , move = function (to) {
            if (board.piece_at(to)) {
                return false;
            }
            if (board.has_index(to)) {
                moves.push(new Move(board.piece_at(index), index, to, flag));
                return true;
            }
        };

    // Move forward single row
    if (move(forward)) {
        // Move two rows forward if pawn in in starting position
        if (! this.has_index(index - (direction * 2))) {
            move(forward + direction);
        }
    }

    // Take an opposition piece diagonally
    for (var i = 0; i < 2; i++) {
        to = [forward - 1, forward + 1][i];
        piece = this.piece_at(to);
        if (piece && this.get_color(piece) === (player ^ 0x80)) {
            moves.push(new Move(this.piece_at(index), index, to));
        // Check for possible en passant moves
        } else if (this.en_passant) {
            if (to - direction === this.en_passant) {
                flag = this.flags.EN_PASSANT;
                moves.push(new Move(this.piece_at(index), index, to, flag));
            }
        }
    }
    return moves;
}

/**
 * Generate a list of for a piece using an offset.
 *  - Includes positions where opponents piece is taken
 *  - Doesn't include positions containing players own pieces
 *  - Doesn't consider check situations
 * @param {int} index of piece
 * @param {array} list of offsets for move generation, i.e. directions
 * @param {int} (this.WHITE or this.BLACK)
 * @param {bool} single (default false) repeat offset?
 * @return {array} List of valid moves
 */
Board.prototype.move_generator = function (index, offsets, player, single) {
    var direction, piece, to
      , moving_piece = this.piece_at(index)
      , moves = [];

    for (var i = 0, l = offsets.length; i < l; i++) {
        direction = offsets[i];
        to = index + direction;
        while (this.has_index(to)) {
            piece = this.piece_at(to);
            if (this.get_color(piece) === player) {
                break;
            }
            moves.push(new Move(moving_piece, index, to));
            to += direction;
            if (piece || single) {
                break;
            }
        }
    }
    return moves;
}

var Move = function (piece, from, to, flags) {
    // Private attributes
    var to, en_passant, is_done = false;

    // Public attributes
    this.piece = piece;
    this.from = from;
    this.to = to;
    this.flags = flags

    this.do = function (board) {
        if (! is_done) {
            to = board.piece_at(to);
            board.positions[this.to] = board.positions[this.from];
            board.positions[from] = undefined;

            if (this.flag === board.flags.EN_PASSANT) {
                en_passant = board.en_passant;
                board.positions[en_passant] = undefined;
            }
            is_done = true;
        }
    }

    this.undo = function (board) {
        if (is_done) {
            board.positions[this.from] = board.positions[this.to];
            board.positions[this.to] = to;

            if (en_passant) {
                board.positions[en_passant] = board.get_color(piece) ^ 0x80;
            }
            is_done = false;
        }
    }

    this.san = function () {
        var board = new Board();
        return [board.get_san(this.from), board.get_san(this.to)].join('');
    }

    return this;
}

/**
 * Psuedo 64-bit integer chess board representation
 *
 * Due to JavaScript's inability to accurately represent 64-bit integers,
 * (max 53-bit) we'll seperate the integer into two 32-bit halves.
 *
 * @param {int} First 32-bit integer (e.g. 0x42000000 [White Knights])
 * @param {int} Second 32-bit integer (e.g. 0x00000042 [Black Knights])
 * @return {obj} BitBoard
 */
var BitBoard = function (a, b) {

    this.a = a || 0;
    this.b = b || 0;

    /**
     * Bitwise AND two bitboards
     *
     * @param {obj} BitBoard
     * @return {obj} BitBoard
     */
    this.and = function (bitboard) {
        return new BitBoard(this.a & bitboard.a, this.b & bitboard.b);
    }

    /**
     * Bitwise OR two bitboards
     *
     * @param {obj} BitBoard
     * @return {obj} BitBoard
     */
    this.or = function (bitboard) {
        return new BitBoard(this.a | bitboard.a, this.b | bitboard.b);
    }

    /**
     * Bitwise XOR two bitboards
     *
     * @param {obj} BitBoard
     * @return {obj} BitBoard
     */
    this.xor = function (bitboard) {
        return new BitBoard(this.a ^ bitboard.a, this.b ^ bitboard.b);
    }

    /**
     * Bitwise NOT this bitboard
     *
     * @return {obj} BitBoard
     */
    this.not = function () {
        return new BitBoard(~this.a, ~this.b);
    }

    this.shift_left = function (n) {
        return new BitBoard(this.a << n, this.b << n);
    }

    this.shift_right = function (n) {
        return new BitBoard(this.a >>> n, this.b >>> n);
    }

    this.is_zero = function () {
        return this.a === 0 && this.b === 0;
    }

    /**
     * Flip board vertically
     */
    this.flip = function () {
        return new BitBoard(_32bitflip(this.b), _32bitflip(this.a));
    }

    /**
     * Mirror board horizontally
     */
    this.mirror = function () {
        return new BitBoard(_32bitmirror(this.a), _32bitmirror(this.b));
    }

    /**
     * Set bit to 1
     * @param {int}
     * @return {obj} BitBoard
     */
    this.set = function (bit) {
        var board = (bit < 32) ? this.a : this.b;
        board |= 1 << bit;

        return this;
    }

    /**
     * Set bit to 0
     * @param {int}
     * @return {obj} BitBoard
     */
    this.clear = function (bit) {
        var board = (bit < 32) ? this.a : this.b;
        board &= (this.a & (1 << bit));

        return this;
    }

    /**
     * Toggle bit 0 - 1 and vice-versa
     * @param {int}
     * @return {obj} BitBoard
     */
    this.toggle = function (bit) {
        var board = (bit < 32) ? this.a : this.b;
        board ^= (1 << bit);

        return this;
    }

    /**
     * Draw a 8x8 board representation of BitBoard
     * @return {str}
     */
    this.toString = function () {
        return draw(this.a) + draw(this.b);
    }

    /* Private methods */

    /**
     * Flip 32-bit Bitboard 'half' vertically
     *
     * @param {int} Bitboard a or b
     * @return {int} Flipped Bitboard 'half'
     */
    function _32bitflip (x) {
        var mask_1 = 0x00FF00FF;
            mask_2 = 0x0000FFFF;
        x = ((x >>  8) & mask_1) | ((x & mask_1) <<  8);
        x = ((x >> 16) & mask_2) | ((x & mask_2) << 16);
        x = (x >> 32) | (x << 32);
        return x;
    }

    /**
     * Mirror 32-bit Bitboard 'half' horizontally
     *
     * @param {int} Bitboard a or b
     * @return {int} mirrored Bitboard 'half'
     */
    function _32bitmirror (x) {
        var mask_1 = 0x55555555,
            mask_2 = 0x33333333,
            mask_4 = 0x0F0F0F0F;
        x = ((x >> 1) & mask_1) +  2 * (x & mask_1);
        x = ((x >> 2) & mask_2) +  4 * (x & mask_2);
        x = ((x >> 4) & mask_4) + 16 * (x & mask_4);
        return x;
    }

    /**
     * @param {int} 32-bit int to draw
     * @return {str}
     */
    function draw (x) {
        var bit, board = [];

        for (var i = 0; i < 32; i++) {
            bit = (x & Math.pow(2, i)) ? 1 : 0;
            if (i % 8 === 0 && i) {
                bit += '\n';
            }
            board.unshift(bit);
        }
        board.unshift('\n');
        return board.join(' ');
    }

    return this;
}

    if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
        module.exports.Board = Board;
    } else {
        window.Board = Board;
    }
})();
