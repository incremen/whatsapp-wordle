# Feature Ideas

## Done
- `!hint` - give one green for free
- `data` - sqlite, store stats per user with `!stats`
- `!wordle <word1> <word2> ...` - start wordle with pre-guesses
- `!stats` - show personal statistics
- `!help` - list all commands, link to github
- `!daily` - daily challenge, same word for everyone each day, dms only
- `!enableStreak (gc only) (admin)` - when enabled, at midnight shows who did the daily wordle and the groupchat's streak (like in discord)
- snapshot should return a file with a backup name including date, .db, not Untitled
- no more bad words in guesses
- !stats show most used starter word
- if in a gc, edit previous message instead of replying with a new one (or make this a gc toggle?)
 

## To (maybe) Do
- prevent duplicate words
- `survival` guess until you run out : start with 10 guesses, if you manage to guess a word in n guesses you get 6-n guesses more. 
- moves should have a field for all 5 letters and if correct or no
- snapshot returns db snapshot
- group admins should be able to do admin commands
- shouldn't be case sensitive
- if you can't use a command it should tell you
- `wordle hard mode`
- `!wordle easy/medium/hard` - classify words into easy/medium/hard, based on existing data
- `!enableDrops (admin)` - random wordle drops in chat, solve for reward, shows on !stats
- `super wordle solver` - 3b1b style: evaluate guesses, show optimal, bits of info
- `!leaderboard` - top players by win rate, avg guesses, streak
- `!streak` - track current/best win streaks per user
- `!duel <@user>` - 1v1 same word, fewest guesses wins
- `!surrender` - give up mid-game (counts as loss in stats)
- Dordle - 2 games at once, 7 guesses
- quit detection - if someone does `!wordle` mid-game, record the old game as a quit
- `!stats` improvements - most used opening words, guess distribution chart?
