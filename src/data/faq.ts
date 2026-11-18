/**
 * The Frequently Asked Questions, shown from the menu (gear) in the top bar, in this order.
 *
 * Each entry is a question and its answer. Apostrophes are fine. A double quote inside the text needs a backslash before
 * it (\"), and \n starts a new line. Add, remove or reorder entries freely; with none, the window says the FAQ is
 * coming soon.
 */
export interface FaqEntry {
  question: string;
  answer: string;
}

export const FAQ: FaqEntry[] = [
  {
    question: 'Where can I read the full rules?',
    answer: 'Open the menu (the gear in the top bar) and choose Official Rules.'
  }
];
