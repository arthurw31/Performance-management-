// TOEIC — contenu additionnel : Listening Part 3 (conversations),
// Part 4 (exposés courts) et Part 6 (textes à compléter).
//
// Part 3/4 : l'audio (script) est lu à voix haute ; les questions et leurs
// choix sont affichés à l'écran, exactement comme au vrai TOEIC. Les lignes
// du script sont préfixées par le locuteur (Man / Woman / Narrator).

const TOEIC_PART3 = [
  {
    title: "Conversation 1 — Au bureau",
    script: `Woman: Hi David, have you finished the quarterly sales report yet? The manager wants to review it before the meeting on Thursday.
Man: Almost. I've completed the figures for Europe and Asia, but I'm still waiting on the numbers from the North American team. They said they'd send them by tomorrow morning.
Woman: Okay. Once you have everything, could you email me a draft? I'd like to check the charts before it goes to the manager.
Man: Sure, I'll send it to you as soon as it's ready — probably tomorrow afternoon.`,
    questions: [
      { text: "What are the speakers mainly discussing?",
        choices: ["A job interview", "A sales report", "A customer complaint", "A holiday schedule"],
        answer: 1, expl: "Dès la première phrase : « the quarterly sales report ». Tout l'échange tourne autour de ce rapport." },
      { text: "Why is the report not finished?",
        choices: ["The manager is away.", "The software crashed.", "Some figures are still missing.", "The deadline was cancelled."],
        answer: 2, expl: "« I'm still waiting on the numbers from the North American team » : il manque des chiffres." },
      { text: "What will the man most likely do next?",
        choices: ["Email a draft to the woman", "Call the manager", "Cancel the meeting", "Travel to North America"],
        answer: 0, expl: "Il accepte : « I'll send it to you as soon as it's ready ». On attend un e-mail avec le brouillon." }
    ]
  },
  {
    title: "Conversation 2 — Réservation d'hôtel",
    script: `Man: Good afternoon, Riverside Hotel. How may I help you?
Woman: Hello, I'd like to book a room for two nights, checking in this Friday. Do you have anything available?
Man: Let me check… Yes, we have a double room at ninety euros per night, breakfast included. Would that work for you?
Woman: That sounds good. But is parking available? I'll be arriving by car.
Man: Yes, we offer free parking for all guests. Shall I confirm the reservation under your name?
Woman: Yes please. It's Laura Martin.`,
    questions: [
      { text: "Why is the woman calling?",
        choices: ["To cancel a booking", "To reserve a hotel room", "To ask for a refund", "To apply for a job"],
        answer: 1, expl: "« I'd like to book a room for two nights » : elle appelle pour réserver." },
      { text: "What is included in the price?",
        choices: ["Dinner", "Airport transfer", "Breakfast", "A guided tour"],
        answer: 2, expl: "« ninety euros per night, breakfast included »." },
      { text: "What does the woman ask about?",
        choices: ["Parking", "The gym", "Late check-out", "Room service"],
        answer: 0, expl: "« is parking available? I'll be arriving by car »." }
    ]
  },
  {
    title: "Conversation 3 — Problème de livraison",
    script: `Woman: Hello, I'm calling about an order I placed last week — order number 4-7-2-1. It still hasn't arrived.
Man: I'm sorry to hear that. Let me look into it… I see the package was shipped on Monday, but it seems it was returned to our warehouse because the address was incomplete.
Woman: Oh, I see. I may have forgotten to add my apartment number.
Man: That would explain it. If you give me the full address now, I can re-send it today at no extra charge.
Woman: Great, thank you. It's 15 Oak Street, apartment 3B.`,
    questions: [
      { text: "What is the problem?",
        choices: ["An order has not arrived.", "A product is broken.", "A payment failed.", "A store is closed."],
        answer: 0, expl: "« It still hasn't arrived » : la commande n'est pas arrivée." },
      { text: "Why was the package returned?",
        choices: ["The customer refused it.", "The address was incomplete.", "It was too heavy.", "The item was out of stock."],
        answer: 1, expl: "« it was returned to our warehouse because the address was incomplete »." },
      { text: "What does the man offer to do?",
        choices: ["Give a full refund", "Re-send the package for free", "Cancel the order", "Transfer the call"],
        answer: 1, expl: "« I can re-send it today at no extra charge » : renvoi gratuit." }
    ]
  }
];

const TOEIC_PART4 = [
  {
    title: "Exposé 1 — Annonce en magasin",
    script: `Narrator: Attention shoppers. Thank you for visiting SuperFresh Market. We'd like to remind you that our weekend sale ends today at eight P.M. All fresh produce is currently thirty percent off, and selected bakery items are buy one, get one free. If you have a SuperFresh loyalty card, don't forget to scan it at checkout to earn double points this weekend. Customer service is located near the main entrance if you need any assistance. Thank you for shopping with us, and enjoy the rest of your day.`,
    questions: [
      { text: "Where would this announcement be heard?",
        choices: ["At an airport", "In a supermarket", "On a train", "At a bank"],
        answer: 1, expl: "« Thank you for visiting SuperFresh Market » et « at checkout » : un supermarché." },
      { text: "When does the sale end?",
        choices: ["Today at 8 P.M.", "Tomorrow morning", "Next weekend", "At noon"],
        answer: 0, expl: "« our weekend sale ends today at eight P.M. »." },
      { text: "How can shoppers earn double points?",
        choices: ["By spending over 50 euros", "By scanning a loyalty card", "By visiting customer service", "By buying bakery items"],
        answer: 1, expl: "« scan it [loyalty card] at checkout to earn double points »." }
    ]
  },
  {
    title: "Exposé 2 — Message vocal professionnel",
    script: `Narrator: Hello, this is a message for Mr. Thompson. This is Sarah calling from Bright Ideas Consulting. I'm calling to confirm our meeting scheduled for Wednesday at ten A.M. Unfortunately, our conference room is being renovated that day, so I'd like to suggest we meet at the café on Fifth Avenue instead. If that doesn't work for you, please call me back at 5-5-5-0-1-9-8 and we can arrange another time. Looking forward to seeing you. Thank you, and have a great day.`,
    questions: [
      { text: "What is the purpose of the message?",
        choices: ["To cancel a meeting", "To confirm and change a meeting location", "To offer a job", "To sell a product"],
        answer: 1, expl: "Elle confirme la réunion mais propose un nouveau lieu : « I'd like to suggest we meet at the café… instead »." },
      { text: "Why is the location changing?",
        choices: ["The room is being renovated.", "The client is sick.", "It is a holiday.", "The office moved."],
        answer: 0, expl: "« our conference room is being renovated that day »." },
      { text: "What should Mr. Thompson do if the new time doesn't suit him?",
        choices: ["Send an email", "Call Sarah back", "Go to the office", "Wait for another message"],
        answer: 1, expl: "« please call me back at 555-0198 and we can arrange another time »." }
    ]
  }
];

// Part 1 : description de photo. Au vrai TOEIC, on voit une photo et on entend
// 4 phrases (A-D) non écrites ; on choisit celle qui décrit le mieux l'image.
// Ici la « photo » est décrite en français, les 4 phrases sont lues en anglais.
const TOEIC_PART1 = [
  { scene: "Un homme en costume tape sur un ordinateur portable dans un bureau. Une tasse de café est posée à côté de lui.",
    statements: [
      "He is typing on a laptop.",
      "He is drinking a cup of coffee.",
      "He is turning off the computer.",
      "He is cleaning his desk."
    ], answer: 0,
    expl: "Il TAPE sur l'ordinateur. Piège classique : la tasse est visible mais il ne BOIT pas — un objet présent ne veut pas dire que l'action a lieu." },
  { scene: "Plusieurs personnes attendent debout sur un quai de gare. Un train arrive au loin.",
    statements: [
      "The passengers are boarding the train.",
      "People are waiting on a platform.",
      "The train is being repaired.",
      "The station is empty."
    ], answer: 1,
    expl: "Ils ATTENDENT sur le quai. Ils ne montent pas encore dans le train (il arrive au loin) — piège d'anticipation." },
  { scene: "Une femme debout devant des étagères range des documents dans un classeur.",
    statements: [
      "She is reading a newspaper.",
      "The shelves are being installed.",
      "She is filing some documents.",
      "She is closing the window."
    ], answer: 2,
    expl: "« To file documents » = classer des documents. Les étagères existent déjà : « are being installed » (passif en cours) est faux." },
  { scene: "Deux ouvriers portant des casques de chantier examinent des plans devant un bâtiment en construction.",
    statements: [
      "They are buying some tools.",
      "They are wearing hard hats.",
      "The construction site is closed.",
      "They are painting a wall."
    ], answer: 1,
    expl: "« Hard hats » = casques de chantier ; ils les PORTENT. Les autres actions (acheter, peindre) ne sont pas décrites." },
  { scene: "Une salle de réunion vide : des chaises sont disposées autour d'une grande table, un écran est fixé au mur.",
    statements: [
      "A meeting is in progress.",
      "People are leaving the room.",
      "The screen is being repaired.",
      "Chairs have been arranged around a table."
    ], answer: 3,
    expl: "Passif d'état « have been arranged » : les chaises SONT disposées. La salle est vide, donc aucune action humaine en cours n'est correcte." },
  { scene: "À la terrasse d'un café, un serveur dépose des assiettes devant des clients attablés.",
    statements: [
      "The customers are paying the bill.",
      "The tables are being cleaned.",
      "A waiter is serving some food.",
      "The café is closed for the day."
    ], answer: 2,
    expl: "Le serveur SERT des plats (« is serving »). Payer, nettoyer ou fermer ne correspondent pas à la scène décrite." }
];

const TOEIC_PART6 = [
  {
    title: "Texte 1 — E-mail interne",
    passage: `To: All staff
Subject: New parking policy

Dear colleagues,

Starting next month, the company will introduce a new parking system. Because the number of employees has grown, parking spaces have become (1)____. To ensure fairness, spaces will now be assigned on a first-come, first-served basis each morning.

We (2)____ encourage staff who live nearby to consider cycling or using public transport. Those who do so will receive a monthly transport allowance.

If you have any questions about these changes, please (3)____ the facilities team. We appreciate your cooperation.

Best regards,
Facilities Department`,
    questions: [
      { text: "Blanc (1)", choices: ["limited", "limits", "limiting", "limitation"], answer: 0,
        expl: "Après « become » (verbe d'état) on attend un adjectif : « limited » (limitées). Les autres sont noms/verbes." },
      { text: "Blanc (2)", choices: ["strong", "strongly", "strength", "stronger"], answer: 1,
        expl: "Il faut un adverbe pour modifier le verbe « encourage » → « strongly encourage »." },
      { text: "Blanc (3)", choices: ["contact", "contacts", "contacting", "contacted"], answer: 0,
        expl: "Après « please » à l'impératif, on emploie la base verbale : « please contact »." }
    ]
  },
  {
    title: "Texte 2 — Lettre commerciale",
    passage: `Dear Ms. Rivera,

Thank you for your recent order. We are writing to inform you that your items have been shipped and (1)____ arrive within five business days.

Please note that a signature will be required (2)____ delivery. If no one is available to receive the package, the courier will leave a card with instructions for rescheduling.

Should you have any concerns about your order, our customer service team is (3)____ available to assist you.

Sincerely,
The Sales Team`,
    questions: [
      { text: "Blanc (1)", choices: ["should", "shouldn't", "should to", "shall not"], answer: 0,
        expl: "« should arrive » = devrait arriver (probabilité). La base verbale suit « should » sans « to »." },
      { text: "Blanc (2)", choices: ["in", "at", "on", "of"], answer: 2,
        expl: "Expression figée « on delivery » = à la livraison (comme « on arrival »)." },
      { text: "Blanc (3)", choices: ["always", "never", "hardly", "rarely"], answer: 0,
        expl: "Le ton est positif et serviable : « always available to assist you » (toujours disponible)." }
    ]
  }
];
