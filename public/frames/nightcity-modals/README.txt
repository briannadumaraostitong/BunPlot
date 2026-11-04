Nightcity Modals
================

15 cyberpunk modal dialogs and system notices for dark interfaces — midnight
blue with hot magenta accents. SVG plus transparent PNG at 1x, 2x and 4x.

Nightcity Modals is a set of 15 modal dialogs and system notices drawn in the
cyberpunk style, where every frame has its own asymmetric outline — a notch on
one corner, a rail down one edge. It contains three modal dialogs at rising
severity, three system plates and three system banners, a three-button footer
row, a close button, a layered backdrop scrim and a plain, a focused and an
error input field.

A modal is not a panel: it stops the game, waits for an answer, and sometimes
the answer cannot be undone. The usual way to say that is a red border, which
collides with the health colour already on screen and disappears the moment a
developer retints the kit to their own palette.

The silhouette is composed rather than scaled: each of the four corners and
four edges takes its own treatment, so no two frames in the set share an
outline. The neon glow is a stack of strokes at falling opacity, not a blur
filter — a filter is applied differently by some SVG rasterisers and turns the
halo into a smear at 4x.

Inside that style this is the Nightcity reading of it: a dark interface on a
midnight blue palette with hot magenta accents, built around a single bordered
frame, chamfered buttons at 176x44, hollow-cored bars divided into 16
segments, and two-tone icons on a 32px grid. Those measurements are why two
families can share an art style without being interchangeable: the style
decides how an edge is drawn, the numbers decide what the interface is for.

Severity is carried by the thickness of the strip along the top edge rather
than by its hue, three pixels for a notice, six for a warning and ten for
something destructive, so it survives any tint and any greyscale screenshot.
The button positions are fixed and deliberate: cancel sits left and raised,
the committing action sits right and recessed. That ordering becomes muscle
memory across a game, and a kit that varies it is how a player deletes a save
by reflex. The scrim is four stacked steps rather than one even wash, because
a single black sheet over the whole screen kills the art it is dimming.

Every sprite ships as an editable SVG and as transparent PNG at 1x, 2x and 4x,
so you can drop the PNGs straight into an engine or open the vector and change
a colour. Built to the same measurements as the rest of the Nightcity family,
which means this kit and the Nightcity panel kit line up without either being
resized. A good fit for cyberpunk, sci-fi and near-future interfaces.

HOW TO USE

  - Keep cancel on the left and the committing action on the right in every
    dialog, including the ones you build yourself from the footer row.
  - Pick the modal by the weight of its top strip rather than retinting one
    sprite. The thickness is the signal.
  - Lay the scrim behind the modal at the size of your screen and tile it: it
    is drawn as discrete steps so it scales without a blur artefact.
  - Use the error input field rather than a red border. It doubles the
    underline, which reads in greyscale and next to a health bar.

License: CC-BY-4.0 — see LICENSE.txt
Page: https://www.colorosse.com/assets/2d/ui/nightcity-modals
More free assets: https://www.colorosse.com
