# Design direction

What the interface is written toward, and what a screen is allowed to spend.
[`../src/app/globals.css`](../src/app/globals.css) is the single token source and holds the values;
this document says what they are for and what refuses to exist.

The product is a study loop seen many times a day, under a small amount of recall pressure. Every
rule below serves one thing: the reader looks at a character, not at an interface.

## The screen is the object

Full bleed, mobile first. No panel, no sidebar, no card grid, no rounded box around a statistic. A
screen holds one subject and the frame that situates it. That frame is a counter and the deck at the
top, and one bar flush with the bottom edge saying how far the session has got. What the reader can
do is the card itself.

The shell is four lines and centres nothing:
[`decisions/0010-behaviour-imported-appearance-written.md`](decisions/0010-behaviour-imported-appearance-written.md)
records why a prose measure is wrong here.

## Four grounds, one accent

The canvas is the page and nothing else is ever painted with it. A slab sits on the canvas, a slab may
sit on a slab, and one well goes the other way. On the dark ground they run from `0.19` to `0.27` in
lightness, warm rather than neutral, and light is the same design on warm paper with the slab going to
pure white.

**A single hue carries almost every signal**, a vermilion the token source names `brand`. It marks the
section label, the dot before the action that continues, the active control, the rule under a field
waiting for an answer, and the one control a card carries.

**Three things are allowed to leave it, and only three.**

An answer that stands as correct goes to `success`, the one unqualified good news the product has. An
answer that did not stand goes to `destructive`. And the dot that says what kind of card this is takes
the colour of its kind: six kinds cannot be told apart by six shades of one hue, so those hues are
spread around the wheel at equal lightness and equal chroma, which keeps them reading as a family
rather than as a rainbow. None of them is the brand, or a type would compete with the only thing
allowed to signal.

Where a scale is needed it is the brand alone, moving in lightness and saturation. The mastery ramp is
that rule taken to its end: the further an item is known, the further its colour recedes toward the
colour of the text, and on a dark ground it recedes toward the light instead. The direction inverts,
the logic does not.

## Almost nothing is enclosed

This is the rule that does the most work. A text field is a rule under the text, not a bordered
rectangle. A toggle is a hairline with a dot at one end. A list row is a label, a value and a hairline.
A button is a word with a dot before it. A consent is a line of text with a stroke that draws itself.

**Two shapes are enclosed, and they are opposites.** The card, which is the subject being studied, is
raised on a large radius. The well inside it, which holds what the character is made of and how to
keep it, is sunk into the card rather than lifted off it. Everything that states a fact is type on a
ground; the two shapes are what is being studied and what explains it.

A control that needs to be found is found by its position and its weight, never by a container drawn
around it.

## The scale jumps

There is almost nothing in the middle. A character is enormous, a heading is large with its lines
pulled tight, body text is quiet, and a section label is ten pixels, uppercase and widely tracked. The
character is set light, because at that size a regular weight turns into a block.

**A character is sized on its length, never on what it is.** The source sends a vocabulary of one
character and one of six, and a size chosen for the type runs the second past both edges of the card.
It sits in a box of its own height, because the ink of a Japanese glyph reaches past the em box it is
set in, and a box that shrinks around it is a character that climbs out of the card.

The silence between those sizes is the composition.

## Two flows, and the card knows which it is in

A lesson teaches and a review asks. The source returns them as separate lists and an assignment is
started before it is ever reviewed, so they are two screens rather than two states of one.

The card opens whole in a lesson, because there is nothing to recall before being taught. It stays
shut in a review until an answer has been given, which is also what makes it survive the keyboard:
that screen is cut in half by it, so a question is the character, the rule its answer is written on,
and the one word saying which of the two things is being asked.

What the card shows in the middle once it opens is the answer to what was asked. Asked for a reading,
a card that opens on its meaning answers a question nobody put.

## What a card carries, and in what order

One shape repeated: a label in small capitals, its value under it, and a hairline between two of them.
No tab, no accordion, no box, no badge. It scrolls, faded at the ends rather than cut, and the top
only fades once something has passed above it, so the first line is whole before anything moves.

The order is the order it is learnt in. The answer, then what that answer really covers, then the
reader's own synonyms, then the readings grouped by kind, then the well with the composition and the
mnemonic, then the reader's notes, then what the character is used in and what it is confused with,
then the part of speech, how the word joins a sentence, and the sentences themselves.

**Where the card sits is last.** Its type, its level and its JLPT band are reached only by reading past
everything else: nobody opens a card to learn its level, and a line that has to be scrolled to is a
line nobody has to step over.

Two conventions do work no label could. Readings are written in the script that names them, katakana
for one borrowed from Chinese and hiragana for one that was already Japanese. And a gloss that is shown
without being accepted recedes to the muted ink under the one that is, because being written somewhere
and being a correct answer are different facts.

**The character gives its room back as the sheet is pulled up.** Its box shrinks and it scales inside
it, so the reader is never holding a third of the card for something they have finished looking at.

## Answering has two states and no third

Before an answer, the field is invisible: a vermilion rule centred under the character, and the answer
appearing on it as it is typed.

After one, there are two outcomes and nothing between them. **An answer that stood takes the field
away with it**, because there is nothing left to compare it against and the right answer standing alone
under the character is the whole point of the card opening. **Everything else stays**, in the
destructive colour and struck through, where it can be read again and corrected: typing into it
withdraws the verdict, since that judgement was about other text.

The strike matters as much as the colour. A verdict carried by hue alone is one a reader who cannot
separate those hues never receives, and the accessibility gate this project runs refuses exactly that.

What the machine found and what the answer was worth are not the same claim. The field says the first.
The reader says the second, and that is what is recorded.

## What the session says about itself

**One number at the top**, the position in the queue, because a corner holds one number well and three
badly.

**Three numbers at the foot of the card** once it has opened, where the answer was while it still
mattered: passed, remaining, missed. Tabular, so none of them moves the others when it changes, and
only the missed one is allowed a colour, and only once there is one to name.

**One bar flush with the bottom of the screen**, two pixels tall, cut into what is passed, what was
missed and what is left. The width is the quantity and the colour says which, so there is no label and
no digit.

The deck itself is a band under the counter: the current subject centred, its neighbours receding and
blurred, a dot in the type's colour under the one being asked. It is pushed by hand as well as
followed, and it snaps to centre, because a list of discrete subjects that stops between two of them
stops on nothing.

## Motion is a consequence, never a decoration

The entrance vocabulary is six pixels and a blur. Nothing slides in from off screen and nothing fades
in only because it appeared.

Beyond it, four movements, each a mechanism the reader already understands: the deck rotates as a card
is swiped away and the one behind rises into place as it goes, the ruler slides under a fixed cursor
when a rate is chosen, the strip scrolls with its neighbours faded, and a progress volume fills like a
liquid.

**A card that leaves is never the card that arrives.** Both layers of the deck are keyed on the
subject in front, so the moment it advances they are new nodes rather than the old ones re-styled.
Without that, the node that just left at five hundred pixels is reused for the card arriving and plays
that distance backwards.

Which lane a movement runs in is decided in
[`decisions/0010-behaviour-imported-appearance-written.md`](decisions/0010-behaviour-imported-appearance-written.md),
under motion.

## Every string resolves through the locale

The direction adds no exception to this. A section label, the word under a field and the name of a
mastery band are copy, and they live with the rest of the copy. Nothing in a component is written in
French.

## Not decided here

**The typeface.** The token source spends the system stack. The grotesque the direction is drawn
against is a dependency, so it arrives through the decision that adds it and not through a screen that
wants it.

**The Japanese face.** The character takes whatever the platform gives `lang="ja"`, with proportional
kana spacing on. Choosing it is the same decision as the typeface and is taken with it.

**The one glyph that is not text.** A radical with no Unicode character arrives as artwork drawn black
for a pale ground, and the host serves it without the headers that would let it be used as a mask, so
it is turned over on the dark ground instead. It is never deferred: a glyph that arrives late is a
question the reader cannot read.

**Where the onboarding and progression screens belong.** Their controls exist and are catalogued: the
question block and its rail, the choice list, the ruler, the setting line, the four fields and the
three progression figures. The routes that would carry them do not, and [`specs/v0.1.md`](specs/v0.1.md)
puts none of them in scope. They reach the product through the spec, not the other way round.

**Where a subject comes from.** The screens take their deck as a prop and the demo one is seeded, so
nothing here decides which subject is asked, for what, or in what order. That is what an assignment
says, and `KnowledgeSource` is what will fetch it.
