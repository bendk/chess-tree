import { newEndgameBook, newOpeningBook, BookSummary } from "./book";
import { newTraining } from "./training";

test("simple selection names", () => {
    expect(newTraining([], { type: "all" }).name).toEqual("All books");
    expect(newTraining([], { type: "endgame" }).name).toEqual("All endgames");
});

test("opening selection names", () => {
    expect(newTraining([], { type: "opening" }).name).toEqual("All openings");
    expect(
        newTraining([], {
            type: "opening",
            color: "w",
        }).name,
    ).toEqual("White openings");
    expect(
        newTraining([], {
            type: "opening",
            color: "b",
        }).name,
    ).toEqual("Black openings");
    expect(
        newTraining([], {
            type: "opening",
            color: "w",
            initialMoves: ["e4", "e5", "Nf3", "Nc6"],
        }).name,
    ).toEqual("White openings: 1.e4 e5 2.Nf3 Nc6");
    expect(
        newTraining([], {
            type: "opening",
            initialMoves: ["e4", "e6", "d4"],
        }).name,
    ).toEqual("All openings: 1.e4 e6 2.d4");
});

test("manual selection names", () => {
    const books: BookSummary[] = [
        newEndgameBook("Rook endings"),
        newOpeningBook("Ruy Lopez", "w", ["e4", "e5", "Nf3", "Nc6", "Bb5"]),
        newOpeningBook("French", "b", ["e4", "e6"]),
    ];
    expect(
        newTraining(books, {
            type: "manual",
            books: [books[0].id],
        }).name,
    ).toEqual("Book: Rook endings");
    expect(
        newTraining(books, {
            type: "manual",
            books: [books[0].id, books[1].id],
        }).name,
    ).toEqual("Books: Rook endings and Ruy Lopez");
    expect(
        newTraining(books, {
            type: "manual",
            books: [books[0].id, books[1].id, books[2].id],
        }).name,
    ).toEqual("Books: Rook endings and 2 others");
});
