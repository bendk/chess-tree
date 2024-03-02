import {
  newOpeningBook,
  newEndgameBook,
  newEndgamePosition,
  Book,
  Nag,
} from "./book";
import { exportBook, importBook } from "./pgn";
import { buildNode } from "./book.test";

test("export opening book", () => {
  const book = newOpeningBook("King Pawn", "w", ["e4", "e5", "Nf3"]);
  book.rootNode = buildNode({
    Nc6: {
      Bb5: {
        comment: "The Ruy Lopez",
        nags: [Nag.GoodMove],
        a6: {
          arrows: ["Gc2c3", "Rc3d4"],
          Ba4: {},
        },
        Nf6: {
          "O-O": {},
        },
      },
    },
    Nf6: {
      Nxe5: {
        squares: ["Rd4", "Gd5"],
      },
    },
  });
  const exported = exportBook(book);
  expect(exported).toEqual(`\
[SetUp "1"]
[FEN "rnbqkbnr/pppp1ppp/8/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R b KQkq - 1 2"]
[Event "?"]
[Site "?"]
[Date "????.??.??"]
[Round "?"]
[White "?"]
[Black "?"]
[Result "*"]
[bookType "opening"]
[bookName "King Pawn"]
[bookColor "w"]
[bookInitialMoves "e4:e5:Nf3"]

1. Nc6 (1. Nf6 Nxe5 { [%csl Rd4,Gd5] }) 1... Bb5 $1 { The Ruy Lopez } 2. a6 { [%cal Gc2c3,Rc3d4] } (2. Nf6 O-O) 2... Ba4 *`);

  checkBooksSame(importBook(exported), book);
});

test("export endgame book", () => {
  const book = newEndgameBook("Endgames");
  const pos1 = newEndgamePosition("k7/8/8/8/8/8/8/K7 w - - 0 1", "w");
  pos1.rootNode = buildNode({
    Kb1: {
      Kb8: {},
    },
    Kb2: {
      Kb7: {},
    },
  });
  const pos2 = newEndgamePosition("7k/8/8/8/8/8/8/7K b - - 0 1", "b");
  pos2.rootNode = buildNode({
    Kg8: {
      Kg1: {},
    },
    Kg7: {
      Kg2: {},
    },
  });
  book.positions = [pos1, pos2];
  const exported = exportBook(book);
  expect(exported).toEqual(`\
[SetUp "1"]
[FEN "k7/8/8/8/8/8/8/K7 w - - 0 1"]
[Event "?"]
[Site "?"]
[Date "????.??.??"]
[Round "?"]
[White "?"]
[Black "?"]
[Result "*"]
[bookType "endgame"]
[bookName "Endgames"]
[positionColor "w"]

1. Kb1 (1. Kb2 Kb7) 1... Kb8 *

[SetUp "1"]
[FEN "7k/8/8/8/8/8/8/7K b - - 0 1"]
[Event "?"]
[Site "?"]
[Date "????.??.??"]
[Round "?"]
[White "?"]
[Black "?"]
[Result "*"]
[bookType "endgame"]
[bookName "Endgames"]
[positionColor "b"]

1. Kg8 (1. Kg7 Kg2) 1... Kg1 *`);

  checkBooksSame(importBook(exported), book);
});

function checkBooksSame(actual: Book, expected: Book) {
  // Remove ids before comparing books
  function normalize(book: Book): object {
    const normalized = Object.fromEntries(
      Object.entries(book).filter(([key, _value]) => key != "id"),
    );
    if ("positions" in normalized) {
      normalized.positions = normalized.positions.map((position: object) =>
        Object.fromEntries(
          Object.entries(position).filter(([key, _value]) => key != "id"),
        ),
      );
    }
    return normalized;
  }
  expect(normalize(actual)).toEqual(normalize(expected));
}
