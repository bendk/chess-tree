import { Book } from "./book";
/**
 * Export a book as PGN
 */
export declare function exportBook(book: Book): string;
/**
 * Import PGN as a book
 */
export declare function importBook(pgnSource: string): Book;
