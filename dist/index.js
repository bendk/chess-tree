"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.importBook = exports.exportBook = exports.TrainingReducer = exports.EditorReducer = exports.NodeReducer = exports.newTraining = exports.restartTraining = exports.booksForTraining = exports.viewNodeTree = exports.splitNode = exports.removeEndgamePosition = exports.newOpeningBook = exports.newEndgamePosition = exports.newEndgameBook = exports.nagText = exports.lineCount = exports.getNodePath = exports.getDescendant = exports.combineNodes = exports.childCount = exports.addEndgamePosition = exports.Priority = exports.POSITION_NAGS = exports.NodeCursor = exports.Nag = exports.MOVE_NAGS = void 0;
var book_1 = require("./book");
Object.defineProperty(exports, "MOVE_NAGS", { enumerable: true, get: function () { return book_1.MOVE_NAGS; } });
Object.defineProperty(exports, "Nag", { enumerable: true, get: function () { return book_1.Nag; } });
Object.defineProperty(exports, "NodeCursor", { enumerable: true, get: function () { return book_1.NodeCursor; } });
Object.defineProperty(exports, "POSITION_NAGS", { enumerable: true, get: function () { return book_1.POSITION_NAGS; } });
Object.defineProperty(exports, "Priority", { enumerable: true, get: function () { return book_1.Priority; } });
Object.defineProperty(exports, "addEndgamePosition", { enumerable: true, get: function () { return book_1.addEndgamePosition; } });
Object.defineProperty(exports, "childCount", { enumerable: true, get: function () { return book_1.childCount; } });
Object.defineProperty(exports, "combineNodes", { enumerable: true, get: function () { return book_1.combineNodes; } });
Object.defineProperty(exports, "getDescendant", { enumerable: true, get: function () { return book_1.getDescendant; } });
Object.defineProperty(exports, "getNodePath", { enumerable: true, get: function () { return book_1.getNodePath; } });
Object.defineProperty(exports, "lineCount", { enumerable: true, get: function () { return book_1.lineCount; } });
Object.defineProperty(exports, "nagText", { enumerable: true, get: function () { return book_1.nagText; } });
Object.defineProperty(exports, "newEndgameBook", { enumerable: true, get: function () { return book_1.newEndgameBook; } });
Object.defineProperty(exports, "newEndgamePosition", { enumerable: true, get: function () { return book_1.newEndgamePosition; } });
Object.defineProperty(exports, "newOpeningBook", { enumerable: true, get: function () { return book_1.newOpeningBook; } });
Object.defineProperty(exports, "removeEndgamePosition", { enumerable: true, get: function () { return book_1.removeEndgamePosition; } });
Object.defineProperty(exports, "splitNode", { enumerable: true, get: function () { return book_1.splitNode; } });
var viewTree_1 = require("./viewTree");
Object.defineProperty(exports, "viewNodeTree", { enumerable: true, get: function () { return viewTree_1.viewNodeTree; } });
var training_1 = require("./training");
Object.defineProperty(exports, "booksForTraining", { enumerable: true, get: function () { return training_1.booksForTraining; } });
Object.defineProperty(exports, "restartTraining", { enumerable: true, get: function () { return training_1.restartTraining; } });
Object.defineProperty(exports, "newTraining", { enumerable: true, get: function () { return training_1.newTraining; } });
exports.NodeReducer = require("./NodeReducer");
exports.EditorReducer = require("./EditorReducer");
exports.TrainingReducer = require("./TrainingReducer");
var pgn_1 = require("./pgn");
Object.defineProperty(exports, "exportBook", { enumerable: true, get: function () { return pgn_1.exportBook; } });
Object.defineProperty(exports, "importBook", { enumerable: true, get: function () { return pgn_1.importBook; } });
