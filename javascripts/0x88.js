var Board = function (fen) {

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
    this.castling = this.B_00 | this.B_000 | this.W_00 | this.W_000
    this.castling_map = {
      'K': this.W_00,
      'Q': this.W_000,
      'k': this.B_00,
      'q': this.B_000}

    this.en_passant = null;

    this.half_moves = 0;
    this.full_moves = 0;

    this.offsets = {
        'R': [-1, -16, 1, 16],
        'N': [31, 33, 14, 18, -18, -14, -33, -31],
        'B': [-15, -17, 15, 17],
    }
    this.offsets['Q'] = this.offsets['R'].concat(this.offsets['B']);

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

    if (fen) {
        this.from_fen(fen);
    }
};

/**
 * Reset board and load game in from FEN notation
 *
 * @param {str} FEN string
 * @todo Add en passant and castling rule parsing
 */
Board.prototype.from_fen = function (fen) {
    var parts = fen.split(' ')
      , board = parts[0].split('/').reverse()
      , castling = parts[2]
      , en_passant = parts[3]
      , row = 0, rank, col, bit;

    this.reset();
    // Basic validation
    // var pattern = /[rnbqkbnrp1-8/]{8} [bw] ([kq]{1,4}|-) ([a-g][0-8]|-) [0-50] \d$/i
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
 *
 * @return {str}
 * @todo Add castling, en passant, half & full moves
 */
Board.prototype.to_fen = function() {
    var fen = []
      , row = []
      , rows = []
      , positions = this.positions.slice().reverse()
      , empty = 0
      , piece = null
      , line_break;

    for (var p = 8, l = positions.length; p < l; p++) {
        piece = this.get_piece(positions[p]);
        line_break = (p % 16 === 0 || p === 127);

        // Add blank squares count
        if (!!empty && (piece || line_break)) {
            if (p === 127) {
                empty++;
            }
            row.push(empty);
            empty = 0;
        }

        // Does current square contain a piece?
        if (piece) {
            row.push(piece);

        // Empty cell - increment empty count
        } else if (!line_break) {
            empty++;
        }

        // Are we at EOL?
        if (line_break || p === l - 1) {
            // Row is reversed, flip it back around
            rows.push(row.reverse().join(''));
            row = [];
            p += 7; // Ignore squares in second board
        }
    }
    fen.push(rows.join('/'));

    fen.push(this.turn === this.WHITE ? 'w' : 'b');
    fen.push(this.fen_get_castling());
    if (this.en_passant) {
        fen.push(this.get_san(this.en_passant));
    } else {
        fen.push('-');
    }
    fen.push(this.half_moves, this.full_moves);
    return fen.join(' ');
}

Board.prototype.fen_get_castling = function () {
    var chars = []

    if (!this.castling) {
        return '-'
    }
    
    for (var key in this.castling_map) {
        if (this.castling & this.castling_map[key]) {
            chars.push(key);
        }
    }
    return chars.join('');
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
 *
 * @param {int} row
 * @param {int} column
 * @return {int} [0-127]
 */
Board.prototype.get_index = function (row, column) {
    var san; // standard algebraic notation

    if (typeof row === "string") {
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
    var file = (index & 7)
      , rank = (index >> 4) + 1;

    return 'abcdefgh'.charAt(file).concat(rank.toString());
}

/**
 * Get color of a piece
 *
 * @param {int} Hex representation of a piece
 * return {int} WHITE or BLACK
 */
Board.prototype.get_color = function (piece) {
    return piece & 0x80;
}

/**
 * Get piece name from it's hex represention
 *
 * @param {int}
 * @return {str|void}
 */
Board.prototype.get_piece = function (code) {
    var key, piece;
    for (key in this.pieces) {
        piece = this.pieces[key];
        if (piece === code) {
            return key;
        }
    }
    return null;
}

/**
 * @param {int} Possible board position index
 * @return {bool}
 */
Board.prototype.has_index = function (index) {
    return !Boolean(index & 0x88);
}

/**
 * @param {int} Piece 0x88 position
 * @return {int} Piece hex representation
 */
Board.prototype.piece_at = function (index) {
    if (this.has_index(index)) {
        return this.positions[index] || null;
    }
    return null;
}

/**
 * Get string representation of a piece
 *
 * @param {int} Hex representation of a piece
 * @return {str|void}
 */
Board.prototype.hex_to_piece = function (hex) {
    // Convert hex to a power of two <= 32
    var key = hex & 0x3F
      , piece = {'1': 'P', '2': 'N', '4': 'K',
                 '8': 'B', '16': 'R', '32': 'Q'}[key.toString()];

    if (!piece) { 
        if (hex <= 0x20) {
            piece = piece.toLowerCase();
        }
        return piece;
    }
    return null;
}

/**
 * @param {int} index of piece
 * @return {array} List of valid moves
 * @todo Add promotion and en passant rules
 */
Board.prototype.valid_pawn_moves = function (index) {
    // Are we moving up or down the board (white or black)
    var direction = this.piece_at(index) & 0x80 ? 16 : -16
      , forward = index + direction
      , moves = []
      , _moves
      , to
      , piece;

    // Move a one or two sqaures forward if both are vacant and valid
    _moves = [forward, forward + direction];
    for (var i = 0, l = _moves.length; i < l; i++) {
        to = _moves[i];
        piece = this.piece_at(to);
        if (piece) {
            break;
        }
        if (this.has_index(to)) {
            moves.push(to);
        }
    }

    // Take an opposition piece diagonally
    _moves = [forward - 1, forward + 1];
    for (var i = 0, l = _moves.length; i < l; i++) {
        to = _moves[i];
        piece = this.piece_at(to);
        if (piece && this.get_color(piece) === (this.turn ^ 0x80)) {
            moves.push(to);
        }
    }
    return moves;
}

/**
 * @param {int} index of piece
 * @return {array} List of valid moves
 */
Board.prototype.valid_knight_moves = function (index) {
    var offsets = this.offsets['N']
      , moves = []
      , piece
      , to;

    for (var i = 0, l = offsets.length; i < l; i++) {
        to = index + offsets[i];
        if (this.has_index(to)) {
            piece = this.piece_at(to);
           if (this.get_color(piece) === (this.turn ^ 0x80)) {
                moves.push(to);
            }
        }
    }
    return moves;
}

/**
 * Generate a list of positions where a sliding piece can move to.
 *
 *  - Includes positions where opponents piece is taken
 *  - Doesn't include positions containing players own pieces
 *  - Doesn't consider check situations
 *
 * @param {int} index of piece
 * @param {array} list of offsets for move generation, i.e. directions
 * @return {array} List of valid moves
 */
Board.prototype.valid_sliding_moves = function (index, offsets) {
    var moves = []
      , direction
      , piece
      , to;

    // console.log(this.to_fen());
    for (var i = 0, l = offsets.length; i < l; i++) {
        direction = offsets[i];
        to = index + direction;
        while (this.has_index(to)) {
            piece = this.piece_at(to);
            if (piece) {
                if (this.get_color(piece) === (this.turn ^ 0x80)) {
                    moves.push(to);
                }
                break;
            }
            moves.push(to);
            to += direction;
        }
    }
    return moves;
}

/**
 * @param {int} index of piece
 * @return {array} List of valid moves
 */
Board.prototype.valid_rook_moves = function (index) {
    return this.valid_sliding_moves(index, this.offsets['R']);
}

/**
 * @param {int} index of piece
 * @return {array} List of valid moves
 */
Board.prototype.valid_bishop_moves = function (index) {
    return this.valid_sliding_moves(index, this.offsets['B']);
}

/**
 * @param {int} index of piece
 * @return {array} List of valid moves
 */
Board.prototype.valid_queep_moves = function (index) {
    return this.valid_sliding_moves(index, this.offsets['Q']);
}

