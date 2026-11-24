-- Riddles are now the sentence with some words swapped for emojis
-- ("My 💔 still has my 👕"), not emojis alone.
ALTER TABLE riddles RENAME COLUMN emojis TO puzzle;
