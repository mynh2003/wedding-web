# The love story of us

- Heading uses the repo's Flavinda font, with no subheading. Cream background and five square-corner portrait images remain.
- Header starts at the section top, pins at viewport center and stops at the section bottom through native CSS sticky.
- Original story is rewritten into four short paragraphs about companionship, understanding, building a home and gratitude. Each paragraph has exactly three explicitly laid-out lines.
- A 78px text window reveals three lines at a time. Scroll progress in .mobile-landing holds each paragraph, then slides up to the next three lines; reverse scrolling reverses the movement. The final paragraph remains visible at the end.
- Body uses the repo's Montserrat font. Cards contain images only; current images are neutral placeholders.
- Cards use intrinsic grid rows with a vertical gap of `clamp(48px, 9svh, 80px)`. Section height follows the five portrait cards and their gaps, so short phones stay compact and tall phones do not create excessive blank space. The heading shares the grid area and retains its sticky behavior.
- Reduced motion removes sticky and shows all paragraphs and images in normal flow. Screen readers receive the entire story without live announcements.
- Envelope and hero are unchanged.
