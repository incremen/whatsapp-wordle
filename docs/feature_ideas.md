# Feature Ideas

- `!daily` - daily challenge (same word for everyone each day)
- `!wordle gc` - group chat mode (solve together as a group)
- `hint` - give one green for free (not in daily)
 - `difficulty` - classify words into easy medium hard via some stats
 - `data` - sqllite, store stats for each user with !stats (like avg guess per game, total games...) and maybe get interesting data in general about common opening words and so on
 - `!help` - should include all commands and link to this github
 - `!enableDrops (admin only)` random wordle that spawns in chat every now and then, and you solve it for a reward. this'll show up on your !stats
 - `super wordle solver` - like in the 3b1b vid. evaluate guesses, show optimal each time, how many bits, etc.



 - maybe record that if you do !wordle mid game, or you just never return to the game, then it registers as quit? also, db currently treats gcs as users. so if multiple people guess together it wont count? i think. not sure. deal with it later