// Workspace-global channels, set C: design-crit, people-team, finance-close,
// ask-pmo, product-launches, customer-stories. Authoring contract: chat-dsl.ts.
import type { GlobalChannelDef } from './chat-dsl';

export const GLOBAL_C: GlobalChannelDef[] = [
  // ─────────────────────────────────────────────────────────────────────
  // #design-crit
  // ─────────────────────────────────────────────────────────────────────
  {
    name: "design-crit",
    topic: "Design critiques, a11y findings and token questions. Post the Figma link + the one question you want answered.",
    size: 5,
    cast: ["hannah"],
    castWeight: 0.1,
    depts: ["Design", "Product", "Engineering", "Marketing"],
    mix: [
      ["crit", 6],
      ["a11y", 3],
      ["tokens", 3],
      ["handoff", 3],
      ["usability", 3],
      ["naming", 2],
      ["logistics", 3],
      ["beforeafter", 3],
      ["generic:feedback", 1],
      ["generic:thanks", 0.5],
      ["generic:question", 0.5],
      ["generic:social", 0.5],
    ],
    lex: {
      surface: ["the empty state", "the settings modal", "the pricing table", "the onboarding checklist", "the approvals drawer", "the mobile nav", "the data table", "the date picker", "the toast system", "the invoice detail page", "the dashboard header", "the search results page"],
      uicomp: ["primary button", "segmented control", "tooltip", "combobox", "tab bar", "filter chip", "inline banner", "side sheet", "skeleton loader", "breadcrumb trail", "toggle", "stepper"],
      dtoken: ["`space.300`", "`color.text.subtle`", "`radius.md`", "`elevation.2`", "`color.brand.strong`", "`font.body.sm`", "`motion.fast`", "`border.focus`", "`color.surface.raised`", "`gap.card`"],
      a11yissue: ["focus order skips the close button", "the error text is not announced to screen readers", "the touch target is 32px and needs 44", "contrast on the helper text is 3.2:1", "the icon-only button has no accessible name", "the modal does not trap focus", "colour is the only error signal", "the tooltip only appears on hover", "the skip link is hidden permanently", "the table headers are not associated with cells"],
      critfix: ["tighten the vertical rhythm", "drop one of the two primary buttons", "move the CTA above the fold", "cut the helper text in half", "swap the icon for a label", "align the baselines", "use the raised surface instead of a border", "give the empty state one clear next step", "reduce the radius to match the card", "group the filters under one control"],
      viewport: ["375px", "390px", "768px", "1024px", "1280px", "1440px", "the narrow breakpoint", "tablet portrait"],
      artefact: ["the spec page", "the Figma library", "the prototype", "the redline", "the token export", "the component page", "the handoff file", "the interaction notes"],
      critopen: ["Posting for crit", "Early crit please", "Rough, but I need eyes on this", "Crit request", "Fresh from the oven, crit welcome", "Looking for a second pair of eyes"],
    },
    intro: [
      [
        "A: **How crit works here.** Post the Figma link ({figma}) plus the *one* question you want answered. Say what stage it is (exploring, converging, polishing). Reviewers: what the design is trying to do first, what works second, questions before prescriptions. “Make it blue” is not feedback; “I lose track of where I am after step 3” is. ~pin:Channel guidelines",
        "B: Also: a11y findings go in here with the WCAG criterion if you know it, and token questions get answered in thread so the next person can find them. ~rx:👍",
      ],
      [
        "A: Standing crit is {day} at {time}, 45 minutes, camera optional. Bring something unfinished. Anything that has been polished to a shine does not need us. ~pin:Standing crit",
        "B: Async crit is welcome too. Post by end of day and we will reply by noon next day. ~r",
      ],
    ],
    pools: {
      crit: [
        [
          "A: {critopen}: {surface}. {figma}\nMain question: does the hierarchy hold up when you scan, or does everything shout at the same volume?",
          "B: Everything shouts. The primary and the secondary action have the same weight, so my eye bounces between them.",
          "C: +1. Make the secondary a ghost style and keep one filled button per view.",
          "A: Fair. Doing that now, will re-share before the end of day. ~rx:👍",
        ],
        [
          "A: Can someone sanity-check spacing on {surface}? It feels off and I cannot say why.",
          "B: You are mixing 12 and 16 between the cards. Everything else is on the 8pt grid.",
          "A: ...yeah. I nudged those by eye on Friday. Fixing.",
          "B: Use {dtoken} and it will snap for you. ~r",
        ],
        [
          "A: Placeholder text in the {uicomp} is 2.9:1 against the field. Not great, but it is the style from the library.",
          "B: It is the thin weight too. Go to medium and darken to hit 4.5.",
          "C: Honestly a placeholder is not a label. Add a visible label and the problem mostly disappears.",
          "A: Visible labels it is. Rev 2 coming. ~rx:🙌",
        ],
        [
          "A: The button says “Submit”. Can we be less 2009?",
          "B: Verb plus object. “Send for approval”.",
          "C: And the empty state says “No data found”, which sounds like it is the user’s fault. Try “Nothing here yet. Add your first one.”",
          "A: Both taken, thanks. Will check with content design on tone.",
        ],
        [
          "A: {critopen}: {surface} at {viewport}. {figma}",
          "B: At {viewport} the secondary column wraps under the main one but keeps its sticky behaviour, so it covers the content. Intended?",
          "A: Not intended. I will drop sticky below the tablet breakpoint.",
        ],
        [
          "A: The drawer slides in at 400ms ease-in-out and it feels slow to me. Anyone else?",
          "B: Yes. Anything the user triggers directly should be {dtoken}-ish, around 150ms. Save the long durations for page transitions.",
          "C: And respect reduced motion. Crossfade instead of slide for those users.",
          "A: Will do both and add a note to {artefact}. ~rx:👍",
        ],
        [
          "A: Quick one: three card layouts in the same grid, all with different padding. Consolidate or is each justified?",
          "B: Two of them are the same card with an optional image. Merge them.",
          "A: Merging. The third really is a different thing (it is a list row, not a card).",
          "B: Then rename it so nobody mistakes it for a card again.",
        ],
        [
          "A: How do we feel about {critfix} on {surface}? I do not want to over-fix.",
          "B: That one change fixes about 70% of what I would say. Do it, post again, then we see what is left.",
          "A: Good framing. Will post v3 tomorrow.",
        ],
        [
          "A: Honest reaction wanted: is this banner too loud? {figma}",
          "B: It is louder than the thing it is warning about. Info does not need an orange fill, a border, an icon and bold text. Pick two.",
          "C: Icon plus text. The colour is already in the icon.",
          "A: Pick-two rule noted. Removing the fill and bold.",
        ],
        [
          "A: Taking a stab at the dense table view for finance users. They want 40 rows visible without scrolling. {figma}",
          "B: Dense is fine, but keep row hover and a stronger zebra or they will lose their place.",
          "C: Also give them a comfortable/compact toggle and persist it. Some of them will love it, some will squint.",
          "A: Toggle added, persisted per user. Thanks both. ~rx:🎉",
        ],
        [
          "A: Typography check: I have five different font sizes between 13 and 15 on one screen. I did not plan that.",
          "B: Classic drift. Collapse to the three body sizes in the ramp, {dtoken} is the smallest allowed for body copy.",
          "A: Ugh, yes. Cleaning up.",
        ],
        [
          "A: We are getting feedback that {surface} has too many empty states for the same condition. {figma}\nCan I get a gut call on collapsing them into one pattern?",
          "B: One pattern with variable copy and a single illustration slot. We only need to vary the next action.",
          "C: Agree, and make the illustration optional so the dense views do not waste 200px on a cartoon.",
          "A: Cool, building the pattern in the library first.",
          "B: Ping me when it lands and I will review the component page. ~rx:👍",
        ],
        [
          "A: Is the dark mode version of this a straight inversion or did you redo the elevation?",
          "B: Redone. In dark, raised surfaces get *lighter*, not shadowed. {dtoken} handles it if you use the semantic token and not the raw hex.",
          "A: I hard-coded one hex. Oops.",
          "B: We have all done it. Lint will find it before I do.",
        ],
        [
          "A: {critopen}, and this one is a bit spicy: replacing the left rail with a command palette for navigation. {figma}",
          "B: Love the palette, but removing the rail entirely is a big bet for occasional users. Can we keep a collapsed rail as a fallback?",
          "C: Our analytics show 60% of sessions use only three destinations. Pin those, palette for the rest.",
          "A: A pinned-three rail plus palette. I like it, that keeps discoverability. Will mock it.",
          "B: Run it past two people from CS before you invest. They will tell you what an occasional user does.",
        ],
        [
          "A: Does anyone have strong feelings about full-width buttons on mobile forms?",
          "B: Yes: they are right for the primary action, wrong for everything else. Secondary should size to content.",
          "A: That is what I needed. Thanks.",
        ],
        [
          "A: Reading level check on the onboarding copy. It scores grade 11 on the tool and our users are not all native English speakers.",
          "B: Shorter sentences, one idea each, no idioms. “Hit the ground running” has to go.",
          "C: I would test it with the Nairobi and São Paulo teams, they are quick to tell us when it is unclear.",
          "A: Great call, will share with the regional leads. ~rx:🙏",
        ],
        [
          "A: Is a modal the right container for a six-field form?",
          "B: No. Side sheet if the user needs context behind it, full page if they will take more than a minute.",
          "C: Modals are for decisions and confirmations. If you can type a paragraph in it, it is a page wearing a costume.",
          "A: A page wearing a costume 😂 moving to a sheet.",
        ],
        [
          "A: Does {surface} need to be that wide? Reading line length is sitting at 120+ characters on {viewport}.",
          "B: Cap the text at about 70ch and let the rest of the container breathe.",
          "A: Good point, I was fixated on filling the grid.",
        ],
        [
          "M: Not a designer, but as someone who uses the approvals view daily: I never find the bulk action. Is it hidden until I tick a row on purpose?",
          "A: It is, and that is probably too clever. Thanks Maya, noted for the next crit.",
          "B: Show a disabled bulk bar with a hint (“Select rows to act”). It teaches the feature without clutter. ~rx:👍",
        ],
        [
          "A: Marketing wants the hero to carry four messages. I think it carries one. {figma}",
          "B: Point to the single message you would be happy with if people only read that.",
          "A: “See every project, risk and dollar in one place.”",
          "B: That is your hero. The other three become a supporting row below the fold.",
          "C: Fully agree. Hero copy is a headline, not a list.",
        ],
      ],
      a11y: [
        [
          "A: Audit finding on {surface}: {a11yissue}. Severity high, it blocks keyboard users.",
          "B: I can take the Figma side and add focus annotations to {artefact}.",
          "C: I will write the test so it does not regress. Linking the ticket {task}.",
          "A: Thank you both. Re-audit on {day}. ~rx:🙌",
        ],
        [
          "A: Axe found {a11yissue} on {surface}. Do we treat that as a bug or a design question?",
          "B: Bug if it is a regression, design question if the pattern itself cannot support it. This one is the pattern, sadly.",
          "A: Then it goes on the design-system backlog with high priority.",
        ],
        [
          "A: Quick reference for anyone designing forms this week:\n```\nlabel   always visible, not a placeholder\nerror   text + icon + aria-live, never colour alone\nfocus   2px ring, 3:1 against adjacent colours\ntarget  44 x 44 minimum on touch\n```",
          "B: Pinning this one. Plain English wins.",
          "C: Add “don’t disable the submit button, validate on submit” and it is the whole checklist. ~rx:👍",
        ],
        [
          "A: Screen reader pass on the new stepper: it announces “list, 5 items” and nothing about which step is current.",
          "B: Needs `aria-current=\"step\"` on the active item. And a visually-hidden “Step 2 of 5”.",
          "A: Will add both and re-test with VoiceOver and NVDA.",
        ],
        [
          "A: Does anyone know whether our brand yellow works as text on white? Marketing wants it for a link colour.",
          "B: It does not. About 1.6:1. Use the “text on yellow” token for foreground when yellow is the fill, and the strong blue for links.",
          "A: Passing that to Marketing. They are not going to be thrilled.",
          "B: Offer them a yellow underline or highlight bar as the accent. They will be thrilled. ~rx:😂",
        ],
        [
          "A: Colour-blind simulation on the status chips: red/green are almost identical for deuteranopia.",
          "B: Add an icon to each (check, triangle, cross) and keep the text. The colour becomes a bonus signal, not the signal.",
          "A: Already in progress. Will post the before/after tomorrow.",
        ],
        [
          "A: Is “click here” ever acceptable in a link?",
          "B: No. Screen reader users pull up a list of links, and a list of 12 “click here” is miserable.",
          "A: Fine. Descriptive link text, no more “learn more” on its own either.",
          "B: “Learn more about approval policies” and we are golden.",
        ],
        [
          "A: The tooltip on the icon-only button only shows on hover. Keyboard users never see it.",
          "B: Show on focus too, dismiss on Escape, keep it on hover so people can move to it (WCAG 1.4.13).",
          "C: Easier still: icon buttons get an accessible name always, tooltip is the sighted bonus.",
          "A: Doing the accessible name now, tooltip behaviour next sprint.",
        ],
        [
          "A: {critopen} on the chart palette. Eight categories in {figma}, and I know that is too many.",
          "B: Eight categorical colours are unreadable for everyone. Top five plus “other”, and direct-label the lines instead of a legend.",
          "C: Direct labels also fix the colour-blind issue. Win win.",
          "A: Top five plus other it is. Thanks.",
        ],
        [
          "A: Reminder: Hover, focus and active states need to exist in the Figma file, not just default. Three components this week arrived without a focus ring.",
          "B: Sorry, that was mine. Adding.",
          "A: No blame, just a nudge. The review checklist now has a line for it. ~rx:👍",
        ],
        [
          "A: Is a 3:1 contrast on a disabled button OK?",
          "B: Disabled controls are exempt from WCAG contrast, but if people cannot tell what it says they cannot tell why it is disabled. I would aim for 3:1 anyway and add the reason in helper text.",
          "A: Reason in helper text. Good.",
        ],
        [
          "A: Pulled a quick screen reader recording of the new filters, and honestly it is rough. Sharing in the thread. ~img:VoiceOver rotor list for the filter chips",
          "B: Oof. Every chip reads as “button” with no state. They need `aria-pressed`.",
          "A: Exactly. Filing it.",
          "C: I can pair on the fix this afternoon.",
        ],
      ],
      tokens: [
        [
          "A: Which token do I use for a border on a card in a table? {dtoken}? or the surface one?",
          "B: Neither. Borders on cards inside tables are a smell, use the surface step. Borders are for inputs.",
          "A: OK, that clarifies my whole afternoon.",
        ],
        [
          "A: Token question: I need a colour for “success” text on the raised surface. The library only has one green.",
          "B: There is a text variant and a fill variant. Using the fill green for text fails contrast. {dtoken} has both in the semantic layer.",
          "A: Ah, I was in the wrong layer. Thanks.",
        ],
        [
          "A: How are we handling theming for the 24 palettes? Is every new component going to need 24 sets of values?",
          "B: No, components only use semantic tokens. The palettes map the semantic layer to raw colours. If you ever reference a raw colour in a component, it breaks the system.",
          "C: Which is why the contrast audit runs on the palettes, not the components.",
          "A: Perfect, that is the model I needed.",
        ],
        [
          "A: Proposal: add a `space.250` token because we keep using 10px. Thoughts?",
          "B: Please don’t. Every half-step is an invitation. 8 or 12.",
          "C: I agree with the ‘no’ but it is worth asking *why* 10 keeps coming up. Probably a component that is too tight at 8.",
          "A: It is the chip. I will fix the component padding instead. ~rx:👍",
        ],
        [
          "A: Did the radius tokens change? Cards look rounder in the new build.",
          "B: Yes, {dtoken} went from 6 to 8 in the last release. Everything using the token followed. Anything with a hard-coded 6 is now the odd one out.",
          "A: Found three. Fixing.",
        ],
        [
          "A: Is there a rule for when to introduce a new component vs a variant?",
          "B: If it has a different job, it is a component. If it is the same job in another size or emphasis, variant. And if you have a variant with more than four props, it is two components.",
          "A: Pinning “more than four props” for the next argument.",
        ],
        [
          "A: Deprecating the old toast. Migration table:\n```\nOldToast.success   ->  Toast tone=\"positive\"\nOldToast.error     ->  Toast tone=\"critical\" (persistent)\nOldToast.info      ->  Banner or nothing\n```",
          "B: The last row is the interesting one. Most “info” toasts should simply not exist.",
          "C: Please give the mobile team a week, they are mid-release.",
          "A: Two weeks. Removal in the version after next.",
        ],
        [
          "A: Quick poll: do we want icons at 20px or 24px in nav items?",
          "B: 20 inside the label line, 24 when the icon stands alone. Consistent with the 8pt grid and optical size.",
          "A: Noted. 20 it is.",
        ],
        [
          "A: Can designers contribute components to the library or is that Platform only?",
          "B: Anyone can propose, but it goes through the contribution template: use cases, two existing implementations, a11y notes. Drop it in {wiki}.",
          "A: Great. Is there a rough ETA from proposal to release?",
          "B: Two to six weeks, depending on how many people need to touch it.",
        ],
        [
          "A: Pulled the latest `{figma}` library and half my overrides vanished. Was there a breaking change?",
          "B: Yes, the button swap-set was rebuilt. The release notes had it but nobody reads release notes (me neither).",
          "A: Fair 😅 Re-linking.",
          "B: Added a banner to the library cover page so it is harder to miss next time.",
        ],
      ],
      handoff: [
        [
          "A: Handoff for {surface} is ready. {figma}\nStatus: states, redlines and copy are all in. One open item: error copy for the timeout case.",
          "B: Eng here. I will start on the layout. Can you flag which parts are final so I do not rebuild twice?",
          "A: Frames with the green dot are final. Yellow dot is still moving.",
          "B: 🟢 only, got it. ~rx:👍",
        ],
        [
          "A: Handing off the filters to engineering. Interaction notes are in the right-hand frame, including what happens on empty results and on narrow screens.",
          "B: Thanks. One question: do the chips wrap or scroll at {viewport}?",
          "A: Wrap, max two lines, then “+N more”. Adding that to the notes.",
        ],
        [
          "A: Pre-handoff checklist from this week’s retro:\n- all states present (hover, focus, disabled, loading, error, empty)\n- dark mode frames\n- copy approved\n- tokens, not hex\n- motion spec if anything moves",
          "B: Add “edge cases with real data”, long names in particular. Every design breaks on a 43-character surname.",
          "A: Yes, adding it. ~rx:👍",
        ],
        [
          "A: Is it OK if I hand off a prototype link and skip the redlines?",
          "B: For a standard pattern from the library, yes. For anything custom, the spacing needs to be written down. Prototypes lie about padding.",
          "A: Fair. Redlines for the custom parts only.",
        ],
        [
          "A: Eng question: the design shows an avatar stack of 5 and the “+N”. At what N do we stop rendering avatars?",
          "B: Stop at 4 on mobile, 5 on desktop. Beyond that it is the +N chip and a tooltip list.",
          "A: Thanks, writing that into the story as {task}.",
        ],
        [
          "A: Request: {artefact} for the new settings page, with the copy deck attached?",
          "B: Attaching the copy deck and the interaction notes. ~file:Settings-copy-deck.xlsx",
          "A: Brilliant, thanks.",
        ],
        [
          "A: QA found that the shipped build differs from design in six places on {surface}: padding, icon size, and four colours.",
          "B: Do you have a diff screenshot? I would like to see whether it is a token issue or a one-off.",
          "A: Posting an overlay. ~img:Design vs build overlay with differences highlighted",
          "C: Three of those are token mismatches, so fixing the token mapping fixes them all.",
        ],
        [
          "A: Design QA before release: who signs off on pixel parity? We keep shipping things that are 90% right.",
          "B: The designer who owns the surface, on the staging build, before the release freeze. If it is not signed off, it is not blocked, but we flag it in the release notes.",
          "A: Light-touch but visible. I can live with that.",
        ],
      ],
      usability: [
        [
          "A: Usability test round 1 done (5 participants). The quote that made me wince:\n> “I assumed that button was just a label. Why would the main action look disabled?”",
          "B: Ouch. The primary button on that screen is the muted brand colour.",
          "A: That is going to be fixed in rev 2. Full notes in {wiki}. ~rx:👍",
        ],
        [
          "A: Highlights from today’s sessions on {surface}:\n- 4 of 5 found the export in under 10 seconds\n- 0 of 5 found bulk edit\n- 3 of 5 read the error message out loud, then did the opposite of what it said",
          "B: The third one is a copy problem for sure.",
          "C: The second is a discoverability problem. Same as Maya’s note earlier.",
          "A: Yes. Planning a quick follow-up test with a visible bulk bar.",
        ],
        [
          "A: Test participant, verbatim:\n> “I do not know what ‘workspace’ means here. Is it my team or my company?”",
          "B: Oh. That is a glossary problem across the app.",
          "C: We have three words for it: workspace, org, tenant. Pick one.",
          "A: Adding it to the naming discussion. It is not going to be pretty.",
        ],
        [
          "A: Five-second test for the new landing page: 4 out of 6 people described the product as “some kind of spreadsheet”.",
          "B: And what is it supposed to be?",
          "A: A portfolio and planning tool.",
          "B: Then the hero image of a grid is working against you. Show a timeline or a board instead.",
        ],
        [
          "A: Looking for 6 volunteers from Sales Ops or Finance for a 20-minute test on the approval flow, {day} afternoon. Coffee on me.",
          "B: I can do it, I am usually the one who finds the confusing bit anyway.",
          "C: Same. Which time slots?",
          "A: Sending a calendar poll now. ~rx:🙌",
        ],
        [
          "A: Quote from the {cust} interview, shared with permission:\n> “I love the concept. I just don’t trust it yet, because I can’t tell what it has already saved.”",
          "B: A trust problem, not a usability problem. We need autosave feedback that is visible.",
          "A: Draft of a “Saved just now” indicator is in {figma}.",
          "B: 👏 subtle, near the title, no toast.",
        ],
        [
          "A: Task completion in the last unmoderated test: 71% on creating a project, 38% on moving a task between lists.",
          "B: What did people do on the second?",
          "A: Dragged to the sidebar. Which does nothing. The sidebar is not a drop target.",
          "B: Make it one. Or at least a tooltip when someone drags across it.",
        ],
        [
          "A: Reminder that observers in usability sessions are *silent*. Last time somebody explained the interface to the participant mid-test 😬",
          "B: I plead guilty. It was so painful to watch.",
          "A: Everybody is guilty. Muting and cameras off from now on. ~rx:😂",
        ],
      ],
      naming: [
        [
          "A: Naming bikeshed incoming: “Workspace”, “Portfolio” or “Space” for the top-level container? Vote with an emoji: 🏢 / 📁 / 🪐",
          "B: 📁 but only because I am tired of the other two.",
          "C: Portfolio already means something specific to the PMO. Do not borrow it.",
          "A: Good catch. Workspace is winning. I will take it to content design.",
        ],
        [
          "A: Is it “Sign in” or “Log in”? Both appear in the product.",
          "B: “Sign in”, and “Sign out”. “Log in” is the verb, “login” is the noun, but we do not need the noun.",
          "A: Sign in everywhere then. Raising a ticket to sweep the strings.",
        ],
        [
          "A: Component name proposal: `Callout` for the inline message block. Currently half the team calls it Banner and half Alert.",
          "B: Banner is full-width at the top of something. Alert is an urgent, announced message. Callout is inline. All three are different, so we may need to keep three.",
          "A: Oh. Then the problem is the usage docs, not the names.",
          "B: Yes. A one-page decision tree will help more than a rename.",
        ],
        [
          "A: Layer naming: please stop calling things “Frame 4812”. 🙏",
          "B: Select the frame, Ctrl+Alt+G to auto-name from the top layer, then fix by hand if needed.",
          "A: That is a lifesaver. I did not know.",
          "C: Added to the Figma etiquette doc.",
        ],
        [
          "A: Token naming: should success/warning/critical be “positive/caution/negative” instead?",
          "B: I prefer success/warning/critical. They match the language engineers and users already use.",
          "C: Changing a token name costs us a migration. The benefit has to outweigh that.",
          "A: Understood. Keeping them.",
        ],
      ],
      logistics: [
        [
          "A: Crit at {time} today, as usual. Three slots: {surface}, the empty-state work, and the mobile nav. Bring questions.",
          "B: Can I swap with the second one? I need to leave at 3:30.",
          "A: Sure, you go second. ~rx:👍",
        ],
        [
          "A: Today’s crit is moved to {time} because of the all-hands. Same room, same link.",
          "B: Thanks for the heads-up. Is it recorded?",
          "A: Yes, and the recording goes in the crit folder in {wiki}.",
        ],
        [
          "A: Who is on notes this week? We missed decisions last time.",
          "B: I can take it. Format: decision, owner, due.",
          "A: Perfect, thanks. Post in this channel after.",
        ],
        [
          "A: If your design is not ready for crit, that is exactly why you should bring it. 😄 The slot is yours if you want it.",
          "B: There is a rumour that the best crits happen with a half-sketched screen.",
          "A: Not a rumour. Bring the mess.",
        ],
        [
          "A: Remote crit tip from {city}: put the Figma link in chat *before* the call so people can zoom in on their own screens. Screen sharing a 1440px frame on a laptop is a crime.",
          "B: Yes. And ask people to put comments in Figma while you present, not after.",
          "C: Comments in the file during the call is the single best change we made last quarter. ~rx:👍",
        ],
        [
          "A: Next week’s crit is going to be a joint one with Product and Engineering on the approvals redesign. Please block the extra 30 minutes.",
          "B: Do we need prep?",
          "A: Read the one-pager ({wiki}) beforehand and bring one concern you would like discussed.",
          "C: Done. Calendar updated.",
        ],
        [
          "A: Design Director office hours this {day}. Sign up for 15-minute slots here if you want a second opinion on portfolio pieces, career paths or just a design argument.",
          "B: Signing up for the {time} slot.",
          "A: Slot confirmed. Bring Figma links, not decks.",
        ],
      ],
      beforeafter: [
        [
          "A: Before/after of the approvals table after Tuesday’s crit. ~img:Approvals table before and after (denser rows, clearer status column)",
          "B: Much better. The status column finally reads as a status column.",
          "C: Is the row height still 40 on touch devices?",
          "A: 48 on touch, 36 on pointer. Thanks for asking.",
        ],
        [
          "A: Rev 3 of the onboarding checklist. Tried to answer everyone’s notes. ~img:Onboarding checklist rev 3 with progress ring and one primary action",
          "B: The single primary action is a big improvement.",
          "C: I like the progress ring, but is 5/7 more motivating than 71%?",
          "A: Great question. A/B test candidate!",
        ],
        [
          "A: Before: 14 form fields on one page. After: 3 steps, 4-5 fields each. ~img:Long form split into a three-step flow",
          "B: Did you test the stepped version against the long one?",
          "A: Yes, completion went from 52% to 79% in the prototype test (n=10, so take that with salt).",
          "B: Salt noted, but encouraging.",
        ],
        [
          "A: Mobile nav explorations, three directions. Vote with 1/2/3. ~img:Three mobile navigation options side by side",
          "B: 2. The bottom bar is where thumbs live.",
          "C: 2, but only four items. The fifth goes in More.",
          "D: 2 as well. Please, no hamburger.",
          "A: Landslide for 2. Thanks all.",
        ],
        [
          "A: Dark-mode pass on the dashboard. The charts were muddy before and I think they are crisp now. ~img:Dashboard in dark mode, charts with the new palette ~rx:🔥",
          "B: The grid lines are way better. Muted and not competing with the data.",
          "A: Dropped them from 20% to 8% opacity. Subtle but it matters.",
        ],
        [
          "A: Empty state redesign: out with the cartoon, in with a short sentence, one button and a link to the guide. ~img:New empty state with short copy and one button",
          "B: 👏 the old one looked like a children’s book.",
          "C: Does it work for the filtered-to-zero case, which is not the same as “nothing yet”?",
          "A: Not yet. Separate variant coming.",
        ],
        [
          "A: Sharing the final redline for {surface} so we have it on record. ~file:Redline-final-v4.pdf",
          "B: Thanks. Linking it from {task}.",
        ],
        [
          "A: Token export for the new palette, if anyone needs to cross-check against the contrast audit. ~file:Palette-tokens-v7.csv",
          "B: Great, I will run it through the contrast script after lunch.",
          "A: Let me know if any pair fails. I would rather fix it now than at release.",
        ],
      ],
    },
  },
  // @@NEXT
];
