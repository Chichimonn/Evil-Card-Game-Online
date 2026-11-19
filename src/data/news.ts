/**
 * The news shown in a pop-up on the main screen (see components/NewsModal.tsx). It opens by itself every time the app
 * starts, and stays until the player closes it; the top bar's menu opens it again. (id: a name for the piece of news.)
 *
 * image: a picture in public/assets/news (until it's added there, a plain panel with the title shows instead).
 * body: paragraphs separated by a blank line. A paragraph that ends in ":" on its own (e.g. "The Challenge:") is shown
 * as a heading. An email address in the text becomes a link that opens the player's email app.
 */
export interface NewsItem {
  id: string;
  title: string;
  image: string;
  body: string;
}

export const CURRENT_NEWS: NewsItem = {
  id: 'captains-challenge-wave-50',
  title: "Captain's Challenge: Wave 50",
  image: '/assets/news/captains-challenge-wave-50.png',
  body: `Thank you sincerely for being among the first players to playtest EVIL Card Game! As part of the recent updates, I have added a single-player endless mode to the game. The computer opponent- well, let's just say it still has lots of learning to do. Your job will be to teach it a lesson. 

The Challenge:

Defeat the endless waves piloted by this hapless buffoon up to wave 50. After making it this far, email proof to adamcd@rogers.com in the form of a video or valid combat logs, along with 1. Your prefered name, 2. Your occupation, and 3. Your favourite 1-3 card type(s).

The Prize:

The first 10 different people to do this will be featured as cards in our upcoming "Captain's Mode", where your EVIL Cards will be given a new objective to defend their most powerful unit. Those players who claim victory will have the chance to fight alongside named characters in the story (to come!) as captains. Stay tuned for more updates!`
};
