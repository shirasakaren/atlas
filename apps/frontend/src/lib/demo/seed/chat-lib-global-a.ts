/**
 * Workspace-wide channels, part A: #general #announcements #random #wins
 * #watercooler #engineering. Authoring contract: ./chat-dsl.ts
 */
import type { GlobalChannelDef } from './chat-dsl';

// ═══════════════════════════ #general ═══════════════════════════
const GENERAL: GlobalChannelDef = {
  name: 'general',
  topic: 'Company-wide chat. Announcements live in #announcements.',
  size: 9,
  cast: ['amara', 'elena', 'daniel'],
  castWeight: 0.2,
  depts: [],
  mix: [
    ['welcome', 9],
    ['notices', 12],
    ['allhands', 8],
    ['social', 12],
    ['help', 8],
    ['funfacts', 5],
    ['generic:ooo', 4],
    ['generic:birthday', 3],
    ['generic:thanks', 2],
    ['generic:poll', 2],
    ['generic:question', 2],
    ['generic:social', 3],
  ],
  lex: {
    event: ['the summer offsite', 'the volunteering day', 'trivia night', 'the book swap', 'the quarterly town hall', 'the hack week showcase', 'lunch-and-learn', 'the wellbeing workshop', 'the family open house', 'the holiday party', 'the step challenge', 'the blood drive'],
    lostitem: ['a black umbrella', 'a green water bottle with a lot of stickers', 'a pair of AirPods in a white case', 'a grey scarf', 'a set of keys with a tiny llama keyring', 'a navy cardigan', 'a reusable coffee cup', 'a USB-C charger', 'a single glove', 'a sunglasses case', 'a paperback with a coffee ring on the cover', 'a bike light'],
    floor: ['the 3rd floor', 'the 5th floor', 'the east wing', 'the ground floor', 'the 2nd floor', 'the west wing', 'the 4th floor kitchen', 'the mezzanine', 'the lobby', 'the basement bike room'],
    cause: ['the regional food bank', 'a local coding-for-kids programme', 'the winter coat drive', 'a river clean-up', 'the children\'s hospital fund', 'the community library', 'a literacy charity', 'the animal shelter', 'a refugee support network', 'the school supplies drive'],
    perkname: ['the wellbeing stipend', 'the learning budget', 'the commuter benefit', 'the home-office allowance', 'the volunteer day', 'the sabbatical programme', 'the mental health coverage', 'the bike-to-work scheme'],
  },
  intro: [
    [
      "A: **Welcome to #general** 👋\n\nThis is the company-wide room for everyone at Halcyon, all {n} time zones of us. A few ground rules:\n\n- **Be kind.** Assume good intent, and remember there are ~190 of us.\n- **Announcements** go in #announcements. Team chatter belongs in your team's channel.\n- **Ask anything.** There are no dumb questions here, and somebody in {city} is always awake.\n- **Keep it safe for work**, with a healthy exception for dog photos (see #random).\n\nPeople-ops questions? Ping {@B}.",
      "B: Adding: if you're new, say hi and tell us one thing you did before Halcyon that nobody would guess. Winner gets bragging rights 🎉 ~rx:👋|🎉",
    ],
  ],
  pools: {
    // ───────────── welcome / people moves ─────────────
    welcome: [
      [
        "A: Please give a very warm welcome to **{p1}**, joining {dept} in {city} today! {p1} comes to us with a lot of experience and a suspiciously good sense of humour. Say hi, and share your best 'what I wish I knew in week one' tip. ~rx:👋|🎉|🙌",
        "B: Welcome {p1}! The 3rd floor kitchen has the good coffee, trust me on that. ☕",
        "C: Welcome aboard!! If you need anything at all, I sit two desks from the plants. You can't miss them.",
        "D: Hi {p1}! Come find me at lunch, we do a rotating group walk around the block at {time}.",
      ],
      [
        "A: New joiners this week 🎉\n\n- **{p1}**, {dept}, {city}\n- **{p2}**, {dept2}, {city}\n- **{p3}**, Customer Success, remote\n\nOnboarding buddies have been assigned. If you're not one of the buddies, you can still say hello.",
        "B: Welcome all three! 👏 ~rx:👏|🎉",
        "C: {p2}, we're in the same standup rotation, see you {day}.",
      ],
      [
        "A: Hi everyone, I'm {A}, just started in {dept} this week. Based in {city}. Excited, a little overwhelmed by how many acronyms there are. Is there a glossary somewhere? 😅",
        "B: There is! {wiki} (search 'glossary'). It's missing about a third of the acronyms, which is itself an acronym problem.",
        "C: Welcome {A}! Lesson one: 'SoR' means system of record. Lesson two: nobody has ever used it correctly.",
        "A: Perfect, that's the most honest onboarding I've had. {thanks} ~r",
      ],
      [
        "A: Welcome back, **{p1}**! After {n} months away, you'll find that the all-hands has a new slide template, the stairs in {city} are being repainted, and the espresso machine is now in a committed relationship with a descaling schedule. ~rx:🎉|❤️|👋",
        "B: Welcome back!! 🫶",
        "C: We saved your desk plant. It looks better than when you left, don't ask.",
      ],
      [
        "A: Quick one: **{p1}** hits **{n} years** at Halcyon today. 🎂 Thank you for all the late-night cutovers, the bad puns, and the fact that every doc you touch gets better.",
        "B: Congrats {p1}! 🥳",
        "C: {n} years and still has the energy to argue about naming conventions in review. Inspiring. ~rx:😂|🎉",
        "D: Cake in {city} at {time}?",
        "A: Cake in {city} at {time}. Confirmed. ~r",
      ],
      [
        "A: Some bittersweet news: today's {p1}'s last day with {dept}. They've done brilliant work, and I know a lot of you have a favourite {p1} story. Drop them below, and send your goodbye notes before the end of the day. 💛 ~rx:💛|😢|🙌",
        "B: Going to miss the {p1} Tuesday memes. A real loss for the culture.",
        "C: You made onboarding bearable for me. Thank you, and keep in touch!",
        "D: Good luck {p1}! The door's always open.",
      ],
      [
        "A: Internal move alert 🚀 **{p1}** is moving from {dept} to {dept2} starting next month. Huge win for {dept2}, and a gap we're already feeling in {dept}. Nobody panic, handover is planned.",
        "B: Congrats {p1}! Well deserved. ~rx:🎉|👏",
        "C: Do we get visiting rights?",
        "A: Visiting rights are in the transfer agreement. ~r",
      ],
      [
        "A: Summer interns start today across {city}, {city2} and remote! 🎓 Please be generous with your time. Reminder: no 'quick favours' that turn into a quarter of unpaid work. Let them learn. ~rx:🙌|🎓",
        "B: I've got two of them in {dept}. They've already asked better questions than I did in my first year.",
        "C: If anyone has a starter ticket in {tracker} they'd like to offer, label it `good-first-ticket`.",
      ],
      [
        "A: Does anyone know who {p1} is? Got a calendar invite from them titled 'Quick sync' with no description 😬",
        "B: {p1} is in {dept}, very nice, they just joined. Accept the invite. It's not a trap.",
        "A: Oh!! Welcome {p1}, accepted. 😅 ~r",
      ],
    ],

    // ───────────── notices & logistics ─────────────
    notices: [
      [
        "A: **Reminder: expense reports are due by end of day {day}.** 🧾\n\n- Receipts over $25 must be attached (photos are fine, but please make sure they're readable)\n- Use the correct cost centre, Finance can't guess it\n- Anything submitted late rolls into next month's cycle\n\nQuestions → {wiki}, or reply here.",
        "B: Does the 'client dinner' category still need the guest list?",
        "A: Yes, names and companies. It's an audit thing. ~r",
        "C: Pro tip: do them weekly. Future you will send flowers.",
      ],
      [
        "A: 🏢 **{city} office notice**: badge readers on {floor} are being replaced between {time} and 5pm on {day}. Doors will be propped open with a person next to them. Please bring your ID and don't tailgate through the temporary ones, security will be watching (nicely).",
        "B: Does this affect the bike room too?",
        "A: Not today, that's scheduled for next week. ~r",
      ],
      [
        "A: **Holiday schedule update.** All offices are closed on {date2}. Support coverage follows the rota in {wiki}. If you're on the rota and haven't swapped yet, please do it by {day}. Thanks everyone for planning ahead. 🙏",
        "B: Does this include {city}? Local holiday calendar is different.",
        "A: Yes, local holidays are on top of this, not instead of it. Details on the wiki page. ~r",
        "B: Perfect, thanks.",
      ],
      [
        "A: Fire drill in {city} at {time} today. Please leave by the nearest stairwell, **don't use the lifts**, and meet at the gathering point across the road. Fire wardens, you know the drill (sorry). ~rx:👍",
        "B: Does standing outside with my laptop count as working from a different location?",
        "A: Yes, but the Wi-Fi is worse. ~r",
        "C: 😂",
      ],
      [
        "A: **Lost & found** 🧳 Reception in {city} is holding {lostitem}, {lostitem2}, and {lostitem3}. If one of them is yours, collect by {day}. After that, they go to charity.",
        "B: Mine's the {lostitem2}. Will pick up at lunch. Thank you!!",
      ],
      [
        "A: Has anyone seen {lostitem}? Left it in the meeting room on {floor} yesterday after the {meeting}. If it turns up, I'll owe you a coffee.",
        "B: Check the shelf behind reception, they put stuff there.",
        "A: Found it! Thank you {B}. Coffee incoming. ~r",
      ],
      [
        "A: 🔧 **Planned maintenance, {city}:** the lifts will be serviced {day} morning. One lift will be running at all times. If you have mobility needs and want a hand, ping the front desk. Thanks for your patience.",
      ],
      [
        "A: **IT notice: guest Wi-Fi in {city} changes today.** The old password stops working at {time}. The new one is on the screen next to reception and in {wiki}. Staff devices are unaffected, please don't hand out the corporate network to visitors, however nice they are. ~rx:👍",
        "B: What about the printers?",
        "A: Printers are on the corporate VLAN, nothing changes. ~r",
      ],
      [
        "A: Reminder that **mandatory security awareness training** is due {day}. It takes about 25 minutes. The link in your inbox is real; if you're not sure, go via {wiki} instead of clicking. Yes, that's the joke of the year.",
        "B: I did it. The quiz asked me to spot the phishing email, and the real phishing email was the one that came to me an hour later 😅",
        "C: That one was the test. We'll announce the click rate and your name is next to it.",
        "B: C!!",
        "C: Kidding. Mostly. ~r",
      ],
      [
        "A: 💻 **Laptop refresh:** if your machine is more than {n} years old, you're eligible for a swap this quarter. Sign up in {tracker} and IT will contact you for a time slot. Please back up local files first (we can't recover your desktop folder of 'final_FINAL_v7').",
        "B: Is the swap in person or shipped for remote folks?",
        "A: Both options. Remote staff get a prepaid courier box. ~r",
      ],
      [
        "A: Parking & bike storage in {city}: the visitor spaces are for visitors, not for the colleague who 'just needs 10 minutes' for three hours. Thank you for your understanding. This message is brought to you by a very tired facilities team. 🚲",
        "B: Bike room is full again. Could we get a second rack?",
        "A: Already approved, installing next month. ~r",
        "B: 🙌",
      ],
      [
        "A: Is anyone else's calendar broken? Meetings are showing at the wrong time, and I just missed {meeting} because it shifted by an hour.",
        "B: Same here. I think it's the daylight-saving thing, mine's showing {time} instead of {time2}.",
        "C: IT is aware, there's a ticket: {ticket}. Fix is rolling out this afternoon. Meanwhile, trust the invite email, not the grid.",
        "A: Thank you, that explains why I've been 'late' to my own meeting all week 😂 ~r",
      ],
      [
        "A: The coffee machine on {floor} is out of order (sad). The one on the 5th floor still works (very sad if you're queueing). Facilities are on it. ☕",
        "B: Thoughts and prayers to the barista-grade grinder.",
      ],
      [
        "A: Heads-up: **the {city} office is closed on {day}** for a building-wide electrical inspection. Please work from home. If you need a desk, {city2} is open.",
        "B: Thanks for the notice. Can we still get in for our laptops?",
        "A: Reception will be open 8-10am for pickups only. ~r",
      ],
      [
        "A: **Benefits open enrollment closes {day}.** Review your plan in the HR portal; if you do nothing, your current choices roll over. Webinars for questions: {date} and {date2}. Recording on {wiki}. ~rx:👍",
        "B: Do dependants need to be re-added?",
        "A: Only if something changed. If you added someone this year, check they're listed. ~r",
      ],
    ],

    // ───────────── all-hands recap + Q&A ─────────────
    allhands: [
      [
        "A: **All-hands recap** 🎤\n\nThanks to everyone who joined (and the {n} of you who watched at 1.5x, we see you). Top takeaways:\n\n1. **{q} went well:** revenue and retention both ahead of plan.\n2. **Two big launches** land next quarter. The comms plan is in {wiki}.\n3. **Hiring:** targeted, not blanket. Check the careers page for referrals.\n4. **Culture:** we're doubling down on written-first updates and fewer meetings.\n\nRecording + slides: {wiki}. Questions we didn't get to are in the thread below.",
        "B: Loved the segment on async decisions. Can we get the template for decision logs?",
        "A: It's linked from the page, under 'Resources'. ~r",
        "C: Any chance we can see the whole Q&A transcript?",
        "A: Yes, posting it tomorrow, with the questions anonymised. ~r",
      ],
      [
        "M: Thanks for the all-hands. A question for leadership: how do the hybrid-office days work for teams spread over several time zones? Are 'anchor days' still on the table?",
        "A: Good one, {me}. No single rule. Teams agree their own anchor day (we're recommending one a week at most) and publish it on their channel. If your team spans {n} time zones, protect shared hours rather than shared desks.",
        "B: This is the answer I've been waiting a year for. 🙏 ~rx:👍|🙌",
        "M: {thanks} That clears it up. I'll write it into our team charter. ~r3",
      ],
      [
        "A: Where can I find the all-hands slides? I missed it because of a customer call and the link in the invite is a dead page.",
        "B: {wiki}, under 'All-hands archive'. The invite link was a typo, sorry.",
        "A: Got it. {thanks} ~r",
      ],
      [
        "A: Question about the new PTO policy: does the unlimited vacation still require manager approval for more than {n} consecutive days?",
        "B: Per the policy doc: anything over {n} days is a heads-up, not a request. In practice, tell your team early and plan handovers.",
        "C: To be clear, 'unlimited' doesn't mean you won't be asked about coverage. It means you won't be asked about *accrual*. ~r",
        "A: That's a helpful distinction, thanks both. ~r",
      ],
      [
        "A: A reminder from me, because it keeps coming up in 1:1s: **shipped is better than perfect, but tested is better than shipped.** Take the extra day for the test plan. Nobody ever got an award for a Sunday rollback. 😄 ~rx:👏|😂",
        "B: Putting this on a mug.",
        "C: Counter-proposal: 'tested is better than shipped, and *documented* is better than tested.'",
        "A: Sold. Both go on the mug. ~r",
      ],
      [
        "A: One of the best things I've seen this week: a team (not naming names, but you know who you are) replaced a 40-minute weekly status meeting with a 4-line written update. They got {hours} back each week. Please steal this idea. ✂️",
        "B: It was us. We cheated: the updates are now longer than the meeting. ~rx:😂",
        "C: Don't care, I still got my Tuesday back.",
      ],
      [
        "A: **Reminder: quarterly town hall** is on {date}. Submit questions in advance via the form on {wiki}. Anonymous is fine, and we'll answer as many as we can live. Questions about comp and promotions get answered by People Ops in writing afterwards, so you'll get a real answer rather than a vague one.",
        "B: Do we still have a live translation for the {city2} team?",
        "A: Yes. Live captions in English, plus Portuguese and German this time. ~r",
        "B: Fantastic.",
      ],
      [
        "A: Thanks all for the feedback on the new onboarding programme. 94% would recommend it; the most common complaint is 'too many welcome emails' and we hear you. We're collapsing them into one daily digest from next week.",
        "B: A digest is such a relief 🙏 ~rx:🙏|👍",
      ],
    ],

    // ───────────── social, events, charity, food ─────────────
    social: [
      [
        "A: 🎗️ **Charity drive:** we're raising funds for {cause} this month. Halcyon will match every donation up to $25k. Donation link on {wiki}. Each dollar goes further when we all chip in, so even $5 is great. Leaderboard is by *department*, so you can start a friendly rivalry.",
        "B: {dept} is taking this. We're going to dominate, just so you know.",
        "C: Challenge accepted. {dept2} will bake brownies for donors. ~rx:🔥|🎉",
        "D: Please remember some of us can't eat nuts. Brownies for everyone, nuts for no-one. 🥜🚫",
      ],
      [
        "A: Sign-ups are open for **{event}**! 🗓️ Capacity is {big}, first come first served. Sign up via {tracker}; if you need accommodations, put them in the form or message {@B}.",
        "B: Happy to help with accessibility requests, DM me. ~rx:🙌",
        "C: Do partners come to this one?",
        "A: Not this time, but the next one is family friendly. ~r",
      ],
      [
        "A: Where to eat near the {city} office? Have a visitor coming and I need ideas beyond the sandwich place on the corner.",
        "B: The ramen counter two blocks over is fantastic, but go before 12:15 or you'll be queueing.",
        "C: If you like noodles, there's a noodle bar on the next street. Fresh pasta in the back, very good.",
        "D: Falafel truck on Thursdays. You're welcome. 🧆",
        "A: Perfect, thanks all. Visitor will be thrilled. ~r",
      ],
      [
        "A: Does anyone have a good dinner recommendation in {city}? A client team is visiting and they want somewhere with 'local flavour' but also 'quiet enough to talk'.",
        "B: A tapas place near the old town, reservation needed. I'll DM you the name.",
        "C: Avoid the places by the station. Tourist prices, so-so food.",
        "A: DM received, booked! ~r",
      ],
      [
        "A: **Volunteer day sign-ups** 🌳 We're planting trees and clearing paths on {day}. Gloves provided, enthusiasm required. Spots: {n} per office. Sign up in {tracker}. Paid time, not annual leave.",
        "B: Booked! Bringing three colleagues from {dept}.",
        "C: Can I bring my kid?",
        "A: Yes for the {city} event, minimum age is 8. ~r",
        "C: She's 9 and has been waiting for this her whole life. 🌱",
      ],
      [
        "A: 🎲 **Trivia night** this {day} at {time} in the {city} office, and online for everyone else. Teams of 4-6. Prize: the golden trophy (a spray-painted trainer, but we respect it). Categories: geography, science, 90s music, and 'things in the building'.",
        "B: Team name proposal: 'Quiz Khalifa'.",
        "C: Ours: 'Les Quizerables'. Don't bother to try to beat us.",
        "D: Team 'Fully Booked' is already formed. Sorry, no vacancies.",
      ],
      [
        "A: Fun fact thread: I'll start. A group of flamingos is called a flamboyance. What've you got?",
        "B: Honey never spoils. Archaeologists found edible honey in ancient tombs.",
        "C: Octopuses have three hearts. Two for the gills, one for the rest. Relatable, I'm running on at most one.",
        "D: Bananas are technically berries, strawberries aren't. Botany is a mess.",
        "A: I love this. Next round tomorrow. ~r",
      ],
      [
        "A: Book swap in the {city} kitchen: bring a book, take a book. Rules: no textbooks, no books you'd be embarrassed to hand to your manager. There's a shelf next to the fridge. 📚",
        "B: I've left three crime novels and a very confusing book on tax. Take it, please.",
        "C: Took one of B's. Excellent choice. Left a book of poems.",
      ],
      [
        "A: **Step challenge starts {day}** 👟 Teams of five, four weeks, with a shared leaderboard. The prize is a team lunch, and a new appreciation for stairs. Opt in on {wiki}.",
        "B: Our team is called 'Sofa So Good' and I'm very confident.",
        "C: I will be walking my dog an extra loop every evening. Competitive advantage.",
        "D: Does cycling count?",
        "A: Yes, converted. 1 km cycling is 1,300 steps. ~r",
      ],
      [
        "A: **Wellbeing week** 🧘 Mon-Fri: lunchtime yoga, a 15-minute desk stretch every day at {time}, and a talk on sleep from a real sleep scientist (not a wellness influencer). Details in {wiki}. Take the break. We mean it.",
        "B: Does the sleep talk include advice for people with newborns?",
        "A: There's a Q&A, and I'd definitely bring that question. ~r",
        "B: Booked. Currently running on 4 hours. 😅",
      ],
      [
        "A: Who's coming to the office holiday party? RSVP by {day} so we can order enough food. Dietary requirements go in the form. Last year we under-ordered the dumplings and there was a... situation.",
        "B: I'm going, but only for the dumplings.",
        "C: The dumpling situation is part of company folklore now.",
        "A: Order's up by 30% this year. ~r",
      ],
      [
        "A: The {city} team lunch is on {day} at {time}. Booking for {n} so far. Let me know if you're in, and tell me if you can't eat anything on this list: gluten, dairy, nuts, shellfish, joy.",
        "B: In. Joy is fine, but I'd skip the nuts.",
        "C: In. Please not another sandwich platter!",
      ],
      [
        "A: 📷 Photo caption contest: what is the {city} office plant on {floor} thinking? Best caption wins a free coffee voucher.",
        "B: 'Another Monday. I've been through worse. I live in a pot.'",
        "C: 'Please don't tell facilities I've been using the aircon as a sauna.'",
        "D: 'I was here before the reorg and I'll be here after.' ~rx:😂|🌿",
        "A: D wins. Voucher on the way. ~r",
      ],
    ],

    // ───────────── help, questions, how-tos ─────────────
    help: [
      [
        "A: Does anyone know how to book a meeting room in {city} that isn't the huge one at the end of the corridor? Every small room shows as booked but I'm pretty sure they're empty.",
        "B: A lot of them are held by recurring invites that people never cancel. Try the 'Release if no-show' button, it frees them after {n} minutes.",
        "A: Oh nice, I had no idea. {thanks} ~r",
        "C: And we're cleaning up recurring ghost bookings next month, Facilities said.",
      ],
      [
        "M: Quick question for the room: what's the right channel for suggestions on the intranet redesign? I've got a few ideas from the PMO.",
        "A: Post them in #feedback, and tag {@B} (they're running the project). Also fill in the 30-second survey on {wiki}.",
        "B: Please do! Intranet is currently older than some of our interns. ~rx:😂",
        "M: Will do, {thanks}",
      ],
      [
        "A: How do I submit a travel request for {city2}? The old form says 'page not found'.",
        "B: It's moved: {wiki}, 'Travel & expenses', then 'New request'. Needs approval from your manager and, for international, finance.",
        "A: That's it, thanks! ~r",
      ],
      [
        "M: Reminder for anyone who is new to PMO-lite: the 'Program health' template in {wiki} has a one-pager version. Takes 10 min instead of an hour. Saved my Tuesday last quarter.",
        "A: Oh that's nice, I was about to rebuild this from scratch. ~r",
        "B: Bookmarked, thanks {me}! ~rx:🙏",
      ],
      [
        "A: Can someone explain the difference between the 'Engineering' and 'IT & Infrastructure' departments? Do I request laptops from one and VPN from the other?",
        "B: IT & Infrastructure handles devices, networks, corporate identity. Engineering builds our product and the infra it runs on. Laptops, VPN, Wi-Fi: IT. Production outages: Engineering.",
        "C: If in doubt, post in #it-help and they'll route it. They're much nicer about it than I am. 😄",
        "A: {thanks}, that finally makes sense. ~r",
      ],
      [
        "A: Does anyone have a spare HDMI to USB-C adapter I can borrow for a {meeting}? The ones in the room all vanished.",
        "B: Top drawer of the supply cabinet on {floor}. Please return it. It's the only one.",
        "A: Got it, thank you! Will return it right after. ~r",
      ],
      [
        "A: Reminder: Slack status is a gift. If you're out, in focus mode, or on a call, set it. We can then stop asking 'quick question?' at the worst possible moment.",
        "B: This. Also, 'hi' is not a message. Say what you need and we'll answer when we can.",
        "C: There's a whole website about it somewhere. Anyway: yes to both. 😂",
      ],
      [
        "A: Is there a good onboarding video for the new expense tool? I watched the official one but it's 40 minutes and has an ominous soundtrack.",
        "B: The 6-minute one by Finance on {wiki} is better, ignore the official video.",
        "A: Perfect. Bless Finance. ~r",
      ],
      [
        "A: Can anyone help me understand how the quarterly goals thing works? My manager mentioned 'OKRs' and I nodded confidently, which I now regret.",
        "B: Objectives and Key Results: each team sets 2-3 objectives, each with measurable results. Don't confuse them with tasks.",
        "C: And please don't set more than three. I once saw a team with fourteen. They have no idea what they were doing.",
        "A: Honestly, thank you both. I feel less like an impostor. ~r",
      ],
      [
        "A: Does anyone else get the 'This message was not sent' error on Slack mobile when on the {city} Wi-Fi?",
        "B: Yes, and it's fixed by switching to cellular for a sec. It's a VPN thing.",
        "C: IT knows, tracking in {ticket}.",
      ],
    ],

    // ───────────── fun facts, one-liners, culture ─────────────
    funfacts: [
      [
        "A: Today in 'things I learned this week': our oldest customer {cust} has been with us for {n} years and still sends a paper holiday card. We have a whole wall of them in {city}. Go see it. ❤️",
        "B: That wall is the best thing in the building. ~rx:❤️|🥹",
      ],
      [
        "A: Reminder that the best Slack messages are the ones that include the **why**, not just the what. Ask for a thing, give the reason, name the deadline. Everyone's day gets 10% better.",
        "B: And bonus points for linking the doc rather than pasting {n} screenshots. ~rx:👍",
      ],
      [
        "A: Leadership one-liner of the week: *If you can't explain it in a paragraph, you don't understand it yet. If you can't explain it in a sentence, you've not yet decided.*",
        "B: Printing this and sticking it on every monitor.",
        "C: The sentence version of my last project doc: 'we're not sure yet.' Honest at least.",
      ],
      [
        "A: Does anyone else find it weird that 'circle back' and 'touch base' have become the most-used phrases in the company? 🫠",
        "B: I'd like to circle back on that offline.",
        "C: Let's take that offline and then circle back.",
        "A: I walked into that. ~r",
      ],
      [
        "A: Fun office fact: {big} cups of coffee were made on the {city} espresso machine last month. We also went through 31 kg of oat milk. Facilities would like to remind us that the machine is not a metaphor for productivity.",
        "B: It's a metaphor for morale. 🫡 ~rx:☕|😂",
      ],
      [
        "A: Hello from {city}! Rain again. Is it just us, or has everyone's calendar become a map of 'time zones I regret'?",
        "B: I scheduled a call at {time} for 'everyone', and learned that the world is not flat. It's only that my calendar is.",
        "C: Singapore says hi, it's already tomorrow here. 🌏",
      ],
      [
        "A: **Culture note.** When you thank someone in public, be specific. 'Thanks {B} for rewriting the cutover plan over the weekend, it made the {meeting} a non-event' beats 'thanks for your help' every time. It takes 10 extra seconds.",
        "B: Taking this one on board. Also, thanks for that, {A}, it's the nicest thing anyone's said today. ~rx:❤️",
      ],
    ],
  },
};

export const GLOBAL_A: GlobalChannelDef[] = [GENERAL];
