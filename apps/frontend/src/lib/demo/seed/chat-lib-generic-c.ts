/**
 * Generic conversation pools (part C): thanks, social, ooo, poll, birthday,
 * intro, ack. The human, off-topic and filler layer of the chat simulator;
 * everything concrete comes from tokens so these drop into any channel.
 * Authoring contract: ./chat-dsl.ts
 */
import type { Pools } from './chat-dsl';

export const GENERIC_C: Pools = {
  // ───────────────────────── thanks ─────────────────────────
  thanks: [
    [
      "A: Thanks {@me} for jumping into the {meeting} when {cust} went sideways. You turned a tense hour into a clear list of next steps. Masterclass in staying calm. ~rx:🙌|👏|❤️",
      "M: Team did the real work with the prep, I just asked the questions out loud. Thanks {A}! 🙂",
    ],
    [
      "M: Quick thank-you to {@A} and {@B} for pulling the status report together overnight. I walked into the steering committee with every number I needed and a calm face. ~rx:🙌|❤️|👏",
      "A: Happy to! You asked for it in plain English, which helps more than you know.",
      "B: Best part: the numbers actually matched. ~rx:😂",
    ],
    [
      "A: Huge thanks to {@B} for staying late last night to get {ver} out the door. Rollback plan was ready, checks were green, and I slept like a baby. 🙌",
      "B: Team effort, {A}. {C} did the smoke tests while I was staring at the pipeline willing it to go faster. ~rx:🎉|👏|🙌|❤️",
      "C: I mostly ate crackers and clicked refresh 😅",
    ],
    [
      "A: Shout-out to {@B} for the cleanest handoff I've ever received. Notes, links, open questions, a list of 'things that will bite you'. I did not have to ask a single follow-up. ~rx:👏|❤️|🙌",
      "B: Written the way I wish somebody had written it for me. Glad it helped!",
    ],
    [
      "A: {thanks} {@B}, that was fast. Fixed in under an hour and the {cust} folks are already replying. ~rx:🙌|❤️",
      "B: Anytime. It was {problem}, as it usually is.",
    ],
    [
      "A: Wanted to say it somewhere public: {@B}'s demo this morning was properly good. Clear story, no dead air, and the live bit actually worked. {cust} asked for a follow-up call. ~rx:🎉|👏|🙌|❤️",
      "C: Seconding. First demo where I didn't check my phone once.",
      "B: You're all too kind. Honestly the dry run with {A} on {day} is what saved it. ~r2",
    ],
    [
      "A: Good catch in review, {@B}. That off-by-one in the date range would have shown up in the {q} report and we'd have spent a week arguing about whose number was right. ~rx:🙌|👏",
      "B: Only noticed because the test data had a leap-year row. Lucky!",
      "A: Lucky is a legitimate engineering strategy 🍀",
    ],
    [
      "A: Appreciation post. Thank you {@B}, {@C}, {@D} for covering while the rest of us were in the {meeting} marathon. Nothing broke, nothing escalated, three tickets quietly closed. That is the dream. ~rx:❤️|🙌|👏",
      "B: No thanks needed but gratefully accepted.",
      "C: We had snacks, it was fine 😄",
      "D: Seconded. Also the snacks were excellent.",
    ],
    [
      "A: Thanks for the quick turnaround on the {doc}, {@B}. Legal had it back to us by noon, which I did not think was physically possible. ~rx:🙌|🎉",
    ],
    [
      "A: Big thanks to {@B} for walking me through {component} yesterday. Forty minutes and I understand more than I did in two weeks of reading the code. ~rx:❤️|🙏",
      "B: Happy to! I'll turn my scribbles into a page in the wiki so the next person gets the same shortcut. {wiki}",
      "A: Please do. I'll proofread it with fresh-eyes confusion, the most valuable kind. ~r",
    ],
    [
      "A: 🎉 {proj} hit the {n}-week mark with zero missed deadlines. That is thanks to everyone here, but especially {@B} for keeping the tracker honest and {@C} for saying 'that's not realistic' out loud when it mattered. ~rx:🎉|👏|🙌|❤️",
      "C: I regret nothing.",
      "B: Honest tracker is just a tracker nobody is afraid of. Thanks all.",
    ],
    [
      "A: To whoever fixed the broken link in {wiki} this morning: you're a hero and I owe you a coffee. ~rx:☕|🙌",
      "B: Me. Coffee accepted. Oat latte, thanks 😄",
    ],
    [
      "A: {@B} spent {hours} on a Saturday untangling {problem} so Monday would be calm. Nobody asked. I just want it on record. ~rx:🙌|❤️|👏|🫡",
      "B: Please don't make it weird, I was bored and the build was red 😂",
      "C: Monday was indeed calm. Thank you!!",
    ],
    [
      "A: Thank you {@B} for the patient explanation, I finally get how the approvals flow works. The diagram made it click. ~rx:🙏|❤️",
    ],
    [
      "A: Quick recognition for the support folks: {pct} of the tickets on {proj} this week were closed inside the SLA even with {p1} out sick. {@B} and {@C}, you carried it with a smile. ~rx:🎉|👏|🙌",
      "B: The smile was mostly caffeine.",
      "C: Mostly 🙂",
    ],
    [
      "A: Thank you for staying calm during the {ticket} mess, {@B}. Everyone else was typing in capital letters, and you just posted a timeline and a next step. That's the whole job. ~rx:🙌|👏|🫡",
      "B: Capital letters are my cue to go and make tea. Thanks, {A}.",
    ],
    [
      "A: Just merged the last piece of {task}. It would not have happened without {@B} unblocking me twice, {@C} on the review, and {@D} for the test data nobody else wanted to touch. Cheers all! 🥂",
      "C: Test data gets no love until it breaks. Well done {D} ~rx:🎉|👏",
      "D: I will be framing this message.",
      "B: Glad to help, and nice work getting it over the line 🎉",
    ],
    [
      "A: Thank you to everyone who came to the {meeting} at 8am. I know. I know. Next one is at a civilised hour, I promise. ~rx:☕|🙌|😅",
      "B: It was still worth it. Bagels helped.",
      "A: Bagels are doing a lot of heavy lifting in this organisation.",
    ],
  ],

  // ───────────────────────── social ─────────────────────────
  social: [
    [
      "M: Rule for today: no one says 'quick sync' before noon. Violators buy the next round of {snack}. 😄",
      "A: Defining 'quick' is my main weakness.",
      "B: I've already lost, I said it in the last {meeting}. ~rx:😂|☕",
    ],
    [
      "A: {@me} did you actually watch the thing everyone's been talking about? No spoilers but I need to know if it's worth the weekend.",
      "M: Worth it. The first episode is slow, stay for the second. 📺",
      "A: Thank you, that's a yes. {weekend} postponed. ~rx:📺|😂",
    ],
    [
      "A: Who keeps leaving {snack} in the kitchen with zero label? Asking for a friend. The friend is me. I ate it.",
      "B: 😂 it was mine but I'm choosing to be flattered",
      "C: Pay the toll: bring more tomorrow ~rx:😂|🍩",
    ],
    [
      "A: Friday deploy, anyone? 👀",
      "B: Absolutely not. Respect the weekend.",
      "A: Just checking you were still awake. ~rx:😂|🙃",
    ],
    [
      "A: Ok who sat on the thermostat? It's either Siberia or a sauna in here, nothing in between 🥶🔥",
      "B: Floor 3 is arctic today. Wearing a coat at my desk like it's a bus stop.",
    ],
    [
      "A: Anyone else's train delayed again or is it just my personal curse? Thirty minutes stationary somewhere outside {city}.",
      "B: Not me, I cycled. Smug level: high.",
      "C: Same train. We're apparently waiting for 'a driver'. Reassuring. ~r2",
      "A: Reading emails on a platform is a lifestyle now.",
    ],
    [
      "A: The typo in last week's invite said 'Quarterly Revenge Review' and I can't unsee it. Can we just make it official 😂",
      "B: Revenge Review is now a standing agenda item. First order of business: who ate {snack}.",
      "C: Seconded. Calendar title updated. ~rx:😂|🤣|🙌",
    ],
    [
      "A: Weekend plans? Mine are {weekend}, and then a long nap to recover from {weekend}.",
      "B: {weekend} here too, plus laundry that has achieved sentience.",
      "C: Sounds ideal. I'm doing {weekend} and hoping it doesn't rain.",
    ],
    [
      "A: Meet Biscuit. He sat on my keyboard during the 9am and sent a message to {B} that just says 'jjjjjjjjjjjjj'. I stand by it. ~img:Biscuit the cat ~rx:😻|❤️|😂",
      "B: I thought it was a code and was ready to escalate 😂",
    ],
    [
      "A: Our office plant has a new leaf!! 🌱 It survived the Great Air Conditioner Incident of last month.",
      "B: Proud parent energy. Does it have a name?",
      "A: Gerald. Obviously. ~rx:🌿|❤️|😂",
      "C: Gerald is thriving, we are not. Teach us your ways.",
    ],
    [
      "A: Cold brew or hot coffee after lunch? This is a values question, please pick wisely.",
      "B: Hot. Always hot. Even in August.",
      "C: Cold brew with one ice cube so I can pretend I'm in control.",
    ],
    [
      "A: Wi-Fi in the big meeting room upstairs is back to its usual speed, which is 'carrier pigeon'. Anyone need a pigeon?",
      "B: Hotspot gang 📱 We know the way.",
      "A: I've started tethering before I even sit down. Learned helplessness is real. ~rx:😂|📱",
    ],
    [
      "A: Book rec for the plane: just finished a slow, wonderful novel about a lighthouse keeper's apprentice. Zero tech, zero spreadsheets, pure bliss. 📚",
      "B: Adding to the list. Last one I loved was about a bakery in a mountain town, same restful feeling.",
      "A: Oh please send the title when you remember.",
      "B: Will dig it out tonight ~rx:📚|❤️",
    ],
    [
      "A: Running club meets {day} at {time} by the river loop. Easy pace, about {n} km, nobody gets left behind. Bring a layer, it's chilly. 🏃",
      "B: In! I'll be the one at the back narrating my own regrets.",
      "C: Count me in, I need to earn the pastries. ~rx:🏃|🙌|💪",
    ],
    [
      "A: Board game lunch {day}, 12:30 in the small room. We have the one about trading sheep, and the one that takes three hours and ends friendships. Vote with your feet. 🎲",
      "B: Sheep one, please. I don't have the emotional bandwidth for the friendship one.",
      "C: I will bring snacks and my very smug face ~rx:🎲|🐑|😂",
    ],
    [
      "A: Weather in {city} today: all four seasons before lunch. Left home in sunshine, now wearing a borrowed umbrella from the lobby.",
      "B: Returning it will be a fun diplomatic mission 😂",
      "A: It was not borrowed so much as 'liberated'.",
    ],
    [
      "A: Pun of the day, brought to you by my terrible brain: the database admin wouldn't take a break because he was afraid of losing his place in the queue. 🥁",
      "B: Please leave the channel.",
      "C: Reacting with a groan and a laugh in equal measure ~rx:😂|🤦|🥁",
    ],
    [
      "A: What are we listening to while heads-down? I'm stuck on the same lo-fi playlist and I think it's looping.",
      "B: Instrumental film scores, no lyrics. Otherwise I end up typing the words.",
      "C: Ambient rain sounds. It's 8 hours of rain. I feel productive and slightly damp.",
      "A: Writing these down. Thanks all 🎧",
    ],
    [
      "A: Reminder that Muffin the office dog (technically {B}'s dog) will be in on {day}. Please do not feed him {snack}. He knows where it is. ~img:Muffin ~rx:🐶|❤️|😍",
      "B: He has already been told. He does not care.",
    ],
    [
      "A: Lunch order for the {team} crew, going {lunch} unless a better idea shows up in 5 minutes.",
      "B: Better idea: {lunch}. Not that different, I know, but I'm hungry and decisive.",
      "C: I trust {B}'s hunger. ~rx:😋|🍜",
    ],
    [
      "A: Does anyone else get the Sunday-night 'I forgot to do something' feeling or is that just me?",
      "B: Every week. I never find out what it was. It's usually nothing.",
      "A: Thanks, that's oddly comforting. ~rx:😅|🫠",
    ],
    [
      "A: Commute tip: the 7:42 is always empty, the 7:48 is always full. Same route, six minutes. Public transit is a mystery wrapped in a timetable.",
      "B: I take the 7:42 and sit by the window like royalty. Don't tell anyone.",
      "C: Telling everyone ~rx:🚆|😂",
    ],
    [
      "A: Our team standing meeting just ended {n} minutes early and I don't know what to do with my hands.",
      "B: Frame this. Mark the date. {date}.",
      "A: Printing a certificate. ~rx:🎉|😂",
    ],
    [
      "A: {greet}! New rule at the coffee machine: whoever empties the grounds gets one free biscuit, no questions asked. This is how civilizations are built.",
      "B: Brilliant. Also whoever refills the water gets two.",
      "C: Inflation already ~rx:😂|☕",
    ],
    [
      "A: Is it just me or has every Zoom call this week had at least one person on mute saying something important for twenty seconds?",
      "B: You are not alone. I've started a tally. Current score: {n}.",
      "C: In the next call I'm going to subtly mime 'you're on mute' like a mime in a snow globe 🙃",
    ],
    [
      "A: Little Friday joke: my sprint was so smooth I assumed I'd forgotten something. Checked the board. I had. 😅",
      "B: The classic. Nothing is calm, you just haven't found the fire yet.",
    ],
    [
      "A: Sourdough starter update: it has risen and it has opinions. I have named it Dough Lipa. {B}, you're welcome to the discard.",
      "B: I will take the discard. And I will say nothing about the name. ~rx:🍞|😂",
      "C: Please bring a loaf to the next {meeting}. I will attend for the bread alone.",
    ],
    [
      "A: Saw a pigeon on the 4th floor terrace trying to eat a whole croissant. He had an intense look of 'I earned this'. Respect.",
      "B: That is the energy I want on Monday morning. ~rx:🐦|🥐|😂",
    ],
    [
      "A: Hot take: standing desks are great for the first week and then you just lean on them.",
      "B: Leaning desk. Best of both worlds.",
      "C: I now have a standing desk and a perfectly comfortable chair, and the chair is winning 🪑",
      "A: The chair always wins. ~rx:😂|🪑",
    ],
    [
      "A: Anyone got a charger for a USB-C laptop? Mine has died in a very dramatic fashion at 6%.",
      "B: Top drawer of the {team} cabinet. Please return it, it has a little sticker on it shaped like a pineapple.",
      "A: Got it. Pineapple secured. 🍍 ~r",
    ],
    [
      "A: Not to alarm anyone, but the vending machine now sells 'artisan' crisps for {usd}. Artisan. Crisps.",
      "B: Who is the artisan, and where do I send my CV",
      "C: The machine is judging us all. ~rx:😂|🥔",
    ],
    [
      "A: Thanks to everyone who walked into the office today with an umbrella and left with someone else's. We have a lobby full of rain gear and a mystery to solve. ☔",
      "B: Mine is the one with the broken spoke and the optimism.",
    ],
    [
      "A: Pair of socks seen in the wild at today's {meeting}: bananas on one foot, pineapples on the other. Whoever you are, bravo.",
      "B: That was me. Thank you for noticing. It's the highlight of my quarter. ~rx:🍌|🍍|😂",
    ],
    [
      "A: Does anyone know whether the vending machine takes cards or only exact change and prayers?",
      "B: Cards, but it only wakes up if you stare at it for a few seconds.",
      "A: Staring works. Thank you. ~rx:😅",
    ],
  ],

  // ───────────────────────── ooo ─────────────────────────
  ooo: [
    [
      "M: Out of office {day}, off to a conference where I'll mostly be hunting for a power socket. {@A} has my approvals and my full confidence, and the {doc} is in {wiki}.",
      "A: Will do. Go find the power socket, we'll hold the fort. ~rx:👍|🔌",
    ],
    [
      "A: Heads up, I'm out {day} through {day2}. {@B} is covering {task} and has the context, so please send anything urgent their way. I'll be back on the Monday.",
      "B: Got it, I've read the thread and bookmarked the open questions. Enjoy the time off! ~rx:👍|🏖️",
    ],
    [
      "A: Heads-down until {time}, deep in {task}. If it's on fire, ping me and I'll surface. If it's smouldering, I'll look at it afterwards. 🎧",
      "B: Understood. Smouldering items will be photographed for the record. ~rx:😂|👍",
    ],
    [
      "A: Back online after two weeks away. 👋 What did I miss? Be kind, I haven't opened my inbox yet and I'm afraid of it.",
      "B: Short version: {task} shipped, {task2} slid a week, and the coffee machine got descaled. Everything else is in the {meeting} notes. {wiki}",
      "C: Also you owe the team a story from the trip. That's non-negotiable. ~rx:🙌|😂",
      "A: Brilliant, thank you. Reading the notes now, story on {day}.",
    ],
    [
      "A: On-call swap request: I'm at a family thing this {day} and can't be near a laptop. Could someone take my slot? Happy to take yours next week plus one extra.",
      "B: I can take {day}. Keep your extra, we'll call it even. ~rx:🙏|🙌",
      "A: You're a lifesaver. Updating the rota now, and I'll send handover notes in the evening.",
    ],
    [
      "A: OOO {date} for a doctor's appointment, back before lunch. Nothing in flight that needs me, but {@B} knows where the bodies are buried if something comes up.",
      "B: The bodies are mostly in the old runbook. I'll try not to dig. {runbook}",
    ],
    [
      "A: First day back from leave and the laptop wanted {n} updates before it would let me log in. Anyway, hello everyone 🙂",
      "B: Welcome back!! We kept the plant alive. Barely. ~rx:🎉|❤️|🌱",
      "C: Welcome back. We saved you a calendar of exactly zero meetings on {day}. Okay that's a lie, there are two.",
      "A: I'll take two. Thank you for the warm welcome.",
    ],
    [
      "A: Quick one: I'm on a train with patchy signal and then in meetings with {cust} all afternoon. Replies might lag until about {time}. For anything blocking, {@B} has my full trust and the keys.",
      "B: Keys are in the safe. No one has the combination. Fine. ~rx:😅",
    ],
    [
      "A: Taking {day} off to be a person. Handover for {task}: status is in the ticket, next step is {B}'s review, and the {doc} is in the wiki. {wiki} See you {day2}!",
      "B: Enjoy being a person! I'll keep the review moving. ~rx:👍|😄",
    ],
  ],

  // ───────────────────────── poll ─────────────────────────
  poll: [
    [
      "M: Help me settle this one, all. Where should we hold the {proj} retro?\n1️⃣ The big room, with the good whiteboards\n2️⃣ Out at the café down the road\n3️⃣ Online, so everyone can multitask 😅 ~rx:1️⃣|2️⃣|3️⃣",
      "A: 2️⃣! Please. Fresh air and a flat white make for better feedback.",
      "M: 2️⃣ takes it. I'll book it for {day} at {time}. Thanks for voting!",
    ],
    [
      "A: Lunch on {day}, team? Vote by reaction:\n1️⃣ {lunch}\n2️⃣ {lunch2}\n3️⃣ Bring your own, join us anyway ~rx:1️⃣|2️⃣|3️⃣",
      "B: Voted. I'd like it noted that I voted for the option with the most napkins.",
      "A: Results are in: 2️⃣ wins by a hair. Booking for {time}. 🍴",
    ],
    [
      "A: Need to pick a time for the {meeting}. Which works best?\n1️⃣ {day} {time}\n2️⃣ {day2} {time}\n3️⃣ I can't do either, I'll comment ~rx:1️⃣|2️⃣|3️⃣",
      "B: 1️⃣ for me, mornings are my only functioning hours.",
      "A: 1️⃣ is ahead by a lot. Sending the invite now, and if you voted 3️⃣, ping me and I'll find you a recording slot.",
    ],
    [
      "A: Offsite date poll, last call! 🗓️\n1️⃣ {date}\n2️⃣ {date2}\n3️⃣ Neither (please say why in the thread) ~rx:1️⃣|2️⃣|3️⃣",
      "B: 2️⃣ unless the venue has coffee at 7, in which case 1️⃣ and I'll arrive early.",
      "C: 2️⃣, also I've booked a dentist on {date} and I'm trying to avoid it.",
      "A: Tally: 2️⃣ takes it. Locking {date2}, will send the calendar hold today. Thanks for voting!",
    ],
    [
      "A: We need a name for the new internal dashboard. Shortlist:\n1️⃣ Beacon\n2️⃣ Compass\n3️⃣ Lighthouse\n4️⃣ Just 'the dashboard' (boring but honest) ~rx:1️⃣|2️⃣|3️⃣|4️⃣",
      "B: Compass sounds like every product ever. Beacon, please.",
      "C: 4️⃣ because nobody ever remembered the name of the last one anyway 😂",
      "A: Beacon wins. Updating the title in {dash} now. Sorry, {C}. ~r",
    ],
    [
      "A: Which {tool} do we adopt for the new request tracking? Needs to be decided before {date}.\n1️⃣ {tool}\n2️⃣ {tool2}\n3️⃣ Stay as we are, with better discipline ~rx:1️⃣|2️⃣|3️⃣",
      "B: Voted 1️⃣. Demo was solid and the migration story is the least scary.",
      "C: 3️⃣, but I've been told discipline is a myth.",
      "A: Result: 1️⃣ with a clear lead. I'll write up the rollout in the {doc} and share it for comments on {day}. {wiki}",
    ],
    [
      "A: Coffee run, who wants what? React:\n1️⃣ flat white\n2️⃣ americano\n3️⃣ tea\n4️⃣ nothing, I'm a robot ~rx:1️⃣|2️⃣|3️⃣|4️⃣",
      "B: 1️⃣ please, you're a hero.",
      "A: Back in 15, tally on the napkin: 1️⃣ x4, 2️⃣ x2, 3️⃣ x1, 4️⃣ x1 (hi {C}) ☕",
    ],
    [
      "A: Friday team activity, pick one:\n1️⃣ Pub quiz at {time}\n2️⃣ Escape room (be warned, last time {B} locked us in)\n3️⃣ Early finish and go home ~rx:1️⃣|2️⃣|3️⃣",
      "B: That was a fire door and it was not my fault!!",
      "C: 3️⃣, always 3️⃣.",
      "A: It's 1️⃣, escape room came second, and 3️⃣ is not a real option I promise. Booking the quiz table.",
    ],
    [
      "A: Quick sanity check on the planning cadence for {proj}. Weekly or every other week?\n1️⃣ Weekly\n2️⃣ Every other week\n3️⃣ Ad hoc, only if something is on fire ~rx:1️⃣|2️⃣|3️⃣",
      "B: 2️⃣, we have enough meetings.",
      "C: 2️⃣, with a Slack update in the off week.",
      "A: 2️⃣ it is. I'll rework the calendar series today and add an async update thread in {ch}. Thanks!",
    ],
  ],

  // ───────────────────────── birthday ─────────────────────────
  birthday: [
    [
      "A: Today is {@me}'s work anniversary! {n} years of keeping a hundred moving parts pointed roughly in the same direction. Thank you, Maya. 🎉 ~rx:🎉|👏|❤️|🥳",
      "M: Thank you all, that made my morning. Cake is on me, I'll sort it by {time}. 🎂",
      "B: Best excuse for cake yet. Congrats! ~rx:🎂",
    ],
    [
      "M: Hello all! Please give a warm welcome to {@A}, who joins {team} this week. Come say hi, we'll introduce you at {day}'s {meeting}. 👋",
      "A: Thank you, Maya! Happy to be here. Looking forward to meeting everyone properly, and getting lost on the way to the kitchen. ~rx:👋|🎉|❤️",
    ],
    [
      "A: Happy birthday {@B}! 🎂 Hope the day is full of cake and devoid of calendar invites.",
      "C: Happy birthday!! 🎉 ~rx:🎂|🎉|❤️|👏",
      "D: Many happy returns, {B}! The cake is in the kitchen and it is chocolate. Move fast.",
      "B: You're all too sweet, thank you ❤️ I'll take the cake, and no I will not share the first slice.",
    ],
    [
      "A: Today marks {n} years since {@B} joined Halcyon Global. Thank you for all the late-night rescues, patient reviews, and generally being the person people ask first. 🎉 ~rx:🎉|👏|❤️|🥳",
      "B: Time flies when the build is red. Thanks all, it's been a great ride.",
      "C: Congrats {B}! 🥳 ~rx:🎂",
    ],
    [
      "A: Everybody say hello to {@B}, who joins us this week as our newest {team} teammate! 👋 They'll be shadowing {@C} on {proj} for the first couple of weeks. Please be nice and send them your favourite lunch spots.",
      "B: Hi everyone! Thrilled to be here, and I will absolutely take lunch tips. Currently scanning the kitchen for the good coffee.",
      "C: Welcome! Desk's sorted, laptop's sorted, and I put the wiki onboarding page at the top of your list. {wiki} ~rx:👋|🎉|❤️",
    ],
    [
      "A: Sad news: {@B}'s last day is {day}. We're gutted to see them go, but thrilled for what's next. Drinks Thursday after work, and please sign the card by the printer. 💙",
      "B: Thank you, {A}. It's been the best team I've worked with. I'll write a proper handover by {day2}, and I'll be sneaking back here for the snacks.",
      "C: We'll miss you!! Keep in touch. ~rx:💙|😢|🥲|🙏",
    ],
    [
      "A: Big news from {@p1}: baby arrived last night! Mum and bub are doing wonderfully. 👶 We'll share a card shortly, no gifts needed, just good vibes. ~rx:🎉|❤️|👶|🥰",
      "B: Huge congratulations to you both!! 🎉",
      "C: So happy for you! Take all the time you need, we've got things covered.",
    ],
    [
      "A: Congratulations to {@B} on the promotion to senior in {team}! Earned in the plainest sense of the word: the quality, the mentoring, the 'I'll just fix it myself' energy. 🎉 ~rx:🎉|👏|🙌|❤️",
      "B: I'm genuinely stunned and grateful. Thank you {A}, and thanks to everyone who has put up with my ideas. Drinks on me!",
      "C: Well deserved. ~rx:👏|🍾",
    ],
    [
      "A: {B} and {C} share a birthday week, which means a shared cake and a shared singing obligation. We will be doing it at {time} {day} by the window. Voices optional, enthusiasm mandatory. 🎂 ~rx:🎂|🎉|🎈",
      "B: I have chosen to leave the building at {time} on {day}. See you after the singing.",
      "C: You're not getting away, {B} 😄",
    ],
    [
      "A: A very happy {n}-year Halcyon anniversary to {@B}! 🎉 Remember when the whole {team} team was five people and a whiteboard? Look at us now. ~rx:🎉|🥳|❤️|👏",
      "C: Wow, that went quickly. Congrats {B}! Here's to many more.",
      "B: Thank you, truly. Still love the whiteboard. Still no idea who took the good marker.",
    ],
    [
      "A: Congratulations to {@B} on tying the knot this weekend! 💍 Wishing you both a lifetime of happiness. The office sends all its love. ~rx:💍|🎉|❤️|🥂",
      "C: So happy for you!! 💖 Photos when you're back, please.",
      "B: Thank you all so much, you made me tear up. Photos incoming. 🙈",
    ],
    [
      "A: Hello and welcome {@B}, our new {team} lead! 🎉 Some of you have already met them on the interview panel. Please say hi and help them find the kitchen, the printers, and the 'secret' power outlets.",
      "B: Delighted to be here! I'm looking forward to learning how things work and, equally, which of the vending machines is lying about its stock.",
      "C: The third one lies. Always the third one. ~rx:👋|🎉|😂",
    ],
  ],

  // ───────────────────────── intro ─────────────────────────
  intro: [
    [
      "M: Welcome to **#{ch}**! 👋 I'm Maya, and I look after programme coordination for {proj}.\n\nThis is the place for updates, questions, and the occasional rant. Please:\n- Keep replies in threads\n- Link the tracker ({tracker}) for anything that needs follow-up\n- Tag me if something is stuck for more than a day\n\nHelpful docs live in {wiki}. ~pin:Start here",
      "A: Thanks Maya. I'll add the team's working hours to the wiki, they're a mystery to half of us. ~rx:🙌|👍",
    ],
    [
      "A: 👋 Welcome to **#{ch}**! This is the working channel for {proj}.\n\n**What goes here**\n- Day-to-day questions, blockers, and quick decisions\n- Heads-ups about changes that touch other people\n- Wins, small or large\n\n**What doesn't**\n- Anything that needs a paper trail (use the tracker: {tracker})\n- Long design debates (start a doc, link it here)\n\nStuck? Ask here first, then tag {@B} if it's still open after an hour. ~pin:Channel guidelines",
      "B: Thanks {A}. For reference, the team wiki is at {wiki} and the onboarding checklist is at the top. Please update it if you find something wrong. ~rx:👍|🙌",
    ],
    [
      "A: Welcome to **#{ch}** 🎉 The home for everything {proj}.\n\nThree ground rules:\n1. Thread your replies. The channel is shared by a lot of people.\n2. Put decisions in the tracker ({tracker}) and link them here.\n3. Don't be shy. Nobody has ever been told off for asking a clear question.\n\nOwner: me. Backup: {@B}. ~pin:Ground rules",
      "B: Adding: if it's urgent, put 🚨 at the start of your message and tag me. I'll see it faster than a normal post. ~rx:👍|🚨",
      "C: And if you aren't sure whether it's urgent, it isn't. Breathe and post. 🙂 ~rx:😂|👍",
    ],
    [
      "A: Hello, and welcome to **#{ch}**!\n\nThis channel is for {proj}, the people who work on it, and the people who ask us nicely for things. 😄\n\n- Help requests: describe the problem, what you've tried, and link the ticket.\n- Announcements: post them here and pin only if it needs to stay.\n- Quiet hours: nobody expects replies after 6pm. Seriously.\n\nStart with {wiki}, it has most of the answers. ~pin:Start here",
      "B: Quiet hours is the best rule. Please keep it. ~rx:🙌|❤️",
    ],
    [
      "A: **How we work in #{ch}** 📌\n\n- Stand-up updates go in the thread under today's post, not as separate messages\n- Questions get an emoji when someone's looking: 👀 means 'on it', ✅ means 'done'\n- Anything touching production gets a ticket first ({tracker}), no exceptions\n\nQuestions about any of this: ask me or {@B}. ~pin:How we work in {ch}",
      "B: I'll add the 👀 and ✅ legend to the wiki so nobody has to scroll. {wiki}",
      "A: Perfect. I'll keep this pinned until someone improves it. ~r",
    ],
    [
      "A: Welcome to **#{ch}**! 🚀\n\nWe're using this channel to coordinate {proj} across {team} and the folks supporting us. Who to ask:\n- Scope and timelines: me\n- Tracker hygiene: {@B}\n- Anything technical: {@C}\n\nPlease read {wiki} before your first post. It's short, I promise. ~pin:Start here",
      "B: I'd just add that stupid questions are welcome. They save us from stupid outages. ~rx:👍|😂",
    ],
    [
      "A: Hi all. This is **#{ch}**, the new channel for {proj}.\n\nA few ways to keep it useful:\n• Use threads. Please.\n• Put screenshots and logs in the thread, not the channel\n• Use `@here` only for real emergencies\n\nThe board is here: {tracker}. Wiki is here: {wiki}. Ask away. ~pin:Ground rules",
      "B: Excited to be here, and big fan of the 'no @here' rule. ~rx:🙌",
    ],
    [
      "A: Welcome aboard #{ch}! 👋\n\nThis is the channel for **{proj}** and I want it to be a friendly one. Some etiquette:\n\n✔ Say hello and tell us what you work on\n✔ Be specific when asking for help (link, error, expected result)\n✔ React to say you've seen it\n✘ No debating the merits of tabs vs spaces. That is a hill we will not die on today.\n\nHelp channel for non-urgent stuff: {wiki}. ~pin:How we work in {ch}",
      "B: Hi everyone! Product designer here, working mostly on the front-end of {proj}. Good to meet you all. ~rx:👋|❤️",
      "C: Hello! I'm on {team}, mostly in the backend. Come find me for anything slow. 🐢 ~rx:😂",
    ],
    [
      "A: **#{ch} is open.** This is where {proj} gets built, argued about, and eventually shipped.\n\nHow to get help:\n1. Search the wiki ({wiki})\n2. Search this channel\n3. Ask here, with a ticket link if you have one\n4. Still nothing? Tag {@B}\n\nBe kind, be concise, and assume good intent. ~pin:Channel guidelines",
      "B: One more thing: celebrate small wins here too. Nobody posts enough of those. ~rx:🎉|🙌",
    ],
    [
      "A: Welcome to **#{ch}** 🙂\n\nTL;DR:\n- **Purpose:** {proj} coordination\n- **Owners:** me and {@B}\n- **Meetings:** {day} at {time}, notes are in the channel afterwards\n- **Decisions:** logged in {tracker}\n- **Tone:** friendly, direct, no drama\n\nIf you're new here, say hi below. ~pin:Start here",
      "C: Hi! Joined from the {team} side this week. Pleased to meet you all. ~rx:👋|🙌",
      "B: Welcome {C}! Come join the {day} meeting. We'll introduce you properly. ~r",
    ],
    [
      "A: Hi everyone, and welcome to **#{ch}**!\n\nWe've created this space for {proj} because the DMs were getting out of hand. 😅 Let's keep conversations here where others can learn from them.\n\n- Quick question? Post it. Someone will answer\n- Need a decision? Add it to {tracker} and link it\n- Found a bug? Add it to {tracker}, then tell us here\n\nThank you for making this a good place to work. ~pin:Ground rules",
      "B: DMs were truly out of hand. I had {n} separate threads open about the same thing. ~rx:😂|🙌",
    ],
  ],

  // ───────────────────────── ack ─────────────────────────
  ack: [
    ["A: is the board updated?", "B: yep, just now"],
    ["A: ok to merge {pr}?", "B: go ahead 👍"],
    ["A: anyone seen the {doc}?", "B: nvm found it, it was in the old folder"],
    ["A: 👀", "B: looking now"],
    ["A: +1 on that", "B: same here"],
    ["A: Can someone take a quick look at {task}?", "B: 👀 looking", "B: ok, looks good to me ✅"],
    ["A: {ack}", "B: 👍"],
    ["A: quick q: is {task} still on for this sprint?", "B: yes, in review today"],
    ["A: did the {meeting} move?", "B: yeah, to {time}", "A: thanks, saved me"],
    ["A: who's on call this week?", "B: {C}, I think. Check the rota {wiki}"],
    ["A: ✅", "B: 🙌"],
    ["A: Thanks for the heads-up", "B: no problem!"],
    ["A: can I get access to {dash}?", "B: sent the request, should come through in a few minutes"],
    ["A: Is the build green for {sha}?", "B: green as of a minute ago"],
    ["A: One sec, finishing something", "B: no rush"],
    ["A: Did we send {cust} the update yet?", "B: not yet, doing it after lunch", "A: perfect, thanks ~rx:👍"],
    ["A: yes please", "B: on it 🫡"],
    ["A: all good on your side?", "B: all good, nothing blocking 👌"],
    ["A: ok that works for me", "B: 👍 booking it"],
    ["A: any update on {ticket}?", "B: waiting on {C}, will chase", "A: ta"],
    ["M: is {task} still blocked?", "A: unblocked since this morning, {B} merged the fix"],
    ["M: can someone drop the link to the {doc} again?", "A: here you go: {wiki}", "M: 🙏"],
    ["A: {@me} are we still good for {time}?", "M: yep, see you then"],
    ["A: 👍", "B: 👍"],
  ],
};
