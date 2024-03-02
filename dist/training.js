"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.restartTraining = exports.newTraining = exports.booksForTraining = void 0;
const uuid_1 = require("uuid");
function booksForTraining(books, selection) {
    return books.filter((book) => bookMatchesSelection(book, selection));
}
exports.booksForTraining = booksForTraining;
function bookMatchesSelection(book, selection) {
    if (selection.type == "all") {
        return true;
    }
    else if (selection.type == "opening") {
        if (book.type != "opening") {
            return false;
        }
        if (selection.color && selection.color != book.color) {
            return false;
        }
        if (selection.initialMoves &&
            (book.initialMoves === undefined ||
                book.initialMoves.slice(0, selection.initialMoves.length) !=
                    selection.initialMoves)) {
            return false;
        }
        return true;
    }
    else if (selection.type == "endgame") {
        return book.type == "endgame";
    }
    else if (selection.type == "manual") {
        return selection.books.indexOf(book.id) != -1;
    }
}
function newTraining(books, selection, shuffle = true) {
    var _a, _b;
    books = booksForTraining(books, selection);
    return {
        id: (0, uuid_1.v4)(),
        timestamp: Math.floor(Date.now() / 1000),
        name: calcName(selection, books),
        position: (_b = (_a = books[0]) === null || _a === void 0 ? void 0 : _a.position) !== null && _b !== void 0 ? _b : "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
        selection,
        currentBook: null,
        startedBooks: [],
        correctCount: 0,
        incorrectCount: 0,
        linesTrained: 0,
        totalLines: books.reduce((currentValue, book) => { var _a; return ((_a = book.lineCount) !== null && _a !== void 0 ? _a : 0) + currentValue; }, 0),
        shuffle,
    };
}
exports.newTraining = newTraining;
function restartTraining(training) {
    return {
        ...training,
        timestamp: Math.floor(Date.now() / 1000),
        currentBook: null,
        startedBooks: [],
        correctCount: 0,
        incorrectCount: 0,
        linesTrained: 0,
    };
}
exports.restartTraining = restartTraining;
function calcName(selection, books) {
    var _a, _b;
    if (selection.type == "all") {
        return "All books";
    }
    else if (selection.type === "endgame") {
        return "All endgames";
    }
    else if (selection.type == "opening") {
        let baseName = "All openings";
        if (selection.color == "w") {
            baseName = "White openings";
        }
        else if (selection.color == "b") {
            baseName = "Black openings";
        }
        if (selection.initialMoves && selection.initialMoves.length > 0) {
            const movesDisplay = selection.initialMoves
                .map((move, index) => {
                if (index % 2 == 0) {
                    return `${1 + index / 2}.${move}`;
                }
                else {
                    return move;
                }
            })
                .join(" ");
            return `${baseName}: ${movesDisplay}`;
        }
        else {
            return baseName;
        }
    }
    else if (selection.type == "manual") {
        const bookNames = new Map(books.map((b) => [b.id, b.name]));
        const firstBookId = selection.books[0];
        if (firstBookId === undefined) {
            return `Books: <none>`;
        }
        const firstBookName = (_a = bookNames.get(firstBookId)) !== null && _a !== void 0 ? _a : "<unknown>";
        if (selection.books.length == 1) {
            return `Book: ${firstBookName}`;
        }
        else if (selection.books.length == 2) {
            const secondBookName = (_b = bookNames.get(selection.books[1])) !== null && _b !== void 0 ? _b : "<unknown>";
            return `Books: ${firstBookName} and ${secondBookName}`;
        }
        else {
            return `Books: ${firstBookName} and ${selection.books.length - 1} others`;
        }
    }
}
