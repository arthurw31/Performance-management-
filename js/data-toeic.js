// Banque TOEIC : grammaire (Part 5), lecture (Part 7), listening (Part 2, synthèse vocale).

const TOEIC_GRAMMAR = [
  { text: "The meeting has been postponed ___ next Monday.",
    choices: ["until", "by", "on", "at"], answer: 0,
    expl: "« Postponed until » = reporté jusqu'à. « By » indiquerait une échéance limite, pas un report." },
  { text: "All employees must submit their expense reports ___ Friday at the latest.",
    choices: ["by", "until", "in", "since"], answer: 0,
    expl: "« By + date » = au plus tard le. « Until » = jusqu'à (action continue), incorrect ici." },
  { text: "Ms. Chen is responsible ___ the new marketing campaign.",
    choices: ["of", "for", "to", "with"], answer: 1,
    expl: "« Responsible for something » — préposition figée à mémoriser (≠ français « responsable de »)." },
  { text: "The new software is much ___ than the previous version.",
    choices: ["efficient", "more efficient", "most efficient", "efficiently"], answer: 1,
    expl: "Comparatif avec « than » : « more efficient than ». « Most » = superlatif ; « efficiently » = adverbe." },
  { text: "___ the heavy rain, the outdoor event was a great success.",
    choices: ["Although", "Despite", "However", "Because of"], answer: 1,
    expl: "« Despite + nom ». « Although » exigerait une proposition (sujet + verbe) ; « however » relie deux phrases." },
  { text: "Neither the manager ___ her assistant was available for comment.",
    choices: ["or", "and", "nor", "but"], answer: 2,
    expl: "Corrélatif figé « neither... nor » (ni... ni)." },
  { text: "The contract must be signed ___ both parties before June 30.",
    choices: ["by", "from", "with", "at"], answer: 0,
    expl: "Voix passive : le complément d'agent s'introduit par « by » (signé PAR les deux parties)." },
  { text: "We look forward to ___ from you soon.",
    choices: ["hear", "hearing", "heard", "be heard"], answer: 1,
    expl: "« Look forward to » + gérondif (-ing) : ici « to » est une préposition, pas la marque de l'infinitif. Très fréquent au TOEIC." },
  { text: "The company has ___ its sales targets for three consecutive years.",
    choices: ["exceed", "exceeds", "exceeded", "exceeding"], answer: 2,
    expl: "Present perfect : « has + participe passé » → « has exceeded »." },
  { text: "All new employees ___ to attend the orientation session.",
    choices: ["require", "requiring", "are required", "requirement"], answer: 2,
    expl: "Passif : les employés SONT tenus d'assister → « are required to attend »." },
  { text: "The annual report was ___ detailed and informative.",
    choices: ["both", "either", "neither", "not only"], answer: 0,
    expl: "« Both... and » : ici « both detailed and informative ». « Not only » exigerait « but also »." },
  { text: "___ you have any questions, please do not hesitate to contact the HR department.",
    choices: ["Should", "Would", "Unless", "Whether"], answer: 0,
    expl: "« Should you have... » = inversion formelle équivalant à « If you have... ». Tournure très courante dans les courriels TOEIC." },
  { text: "Prices are subject ___ change without prior notice.",
    choices: ["of", "to", "for", "with"], answer: 1,
    expl: "Expression figée « subject to change » = susceptible d'être modifié." },
  { text: "Mr. Lopez has worked at the Chicago branch ___ 2015.",
    choices: ["for", "since", "during", "from"], answer: 1,
    expl: "« Since + point de départ » (2015) ; « for + durée » (for nine years)." },
  { text: "Your order will be delivered ___ five business days.",
    choices: ["within", "until", "by the time", "at"], answer: 0,
    expl: "« Within + durée » = dans un délai de. « Until » marquerait une continuité jusqu'à un moment donné." },
  { text: "Please review the ___ document before tomorrow's meeting.",
    choices: ["attach", "attached", "attaching", "attachment"], answer: 1,
    expl: "Participe passé adjectival : « the attached document » = le document ci-joint. « Attachment » est le nom (une pièce jointe)." },
  { text: "Sales of the new model increased ___ 15% during the last quarter.",
    choices: ["by", "at", "of", "on"], answer: 0,
    expl: "« Increase by + pourcentage » = augmenter DE 15 %. « Increase to » = atteindre (une valeur)." },
  { text: "___ of the applicants had the required five years of experience.",
    choices: ["Few", "Little", "Much", "Any"], answer: 0,
    expl: "« Applicants » est dénombrable → « few ». « Little » s'emploie avec les indénombrables (little time)." },
  { text: "The CEO announced that the merger ___ completed by the end of June.",
    choices: ["will be", "would be", "has been", "is"], answer: 1,
    expl: "Concordance des temps au discours indirect : « announced that... would be » (futur dans le passé)." },
  { text: "Our team worked ___ to meet the tight deadline.",
    choices: ["efficient", "efficiency", "efficiently", "more efficient"], answer: 2,
    expl: "Il faut un adverbe pour modifier le verbe « worked » → « efficiently »." }
];

const TOEIC_READING = [
  {
    title: "E-mail — Office relocation",
    passage: `From: facilities@nordicatech.com
To: All staff
Subject: Office relocation — action required
Date: March 3

Dear colleagues,

As announced at last month's all-hands meeting, our office will move to the Riverside Business Park on Friday, March 21. The new building offers twice as much meeting space, a staff cafeteria, and direct access to the Line 4 subway station.

To prepare for the move, please pack your personal belongings in the boxes that will be distributed on March 17, and clearly label each box with your name and your new floor number, which you can find on the intranet. IT equipment should NOT be packed: the technical team will handle all computers and monitors on the evening of March 20.

The office will be closed on Friday, March 21. All employees are expected to work remotely that day. Normal operations will resume at the new location on Monday, March 24.

Questions? Contact the facilities team before March 14.

Best regards,
Facilities Department`,
    questions: [
      { text: "What is the main purpose of the e-mail?",
        choices: [
          "To announce the construction of a cafeteria",
          "To give employees instructions about an office move",
          "To invite staff to an all-hands meeting",
          "To report a problem with IT equipment"
        ],
        answer: 1,
        expl: "L'objet (« action required ») et le corps du message donnent les consignes du déménagement. Les autres éléments (cafétéria, réunion) ne sont que des détails." },
      { text: "What are employees asked to do with their computers?",
        choices: [
          "Pack them in labeled boxes",
          "Take them home on March 20",
          "Leave them for the technical team to handle",
          "Return them to the facilities department"
        ],
        answer: 2,
        expl: "« IT equipment should NOT be packed: the technical team will handle all computers... » — piège classique sur la négation." },
      { text: "What will happen on March 21?",
        choices: [
          "Employees will work from the new office.",
          "Boxes will be distributed to the staff.",
          "The office will be closed and staff will work remotely.",
          "An all-hands meeting will take place."
        ],
        answer: 2,
        expl: "« The office will be closed on Friday, March 21. All employees are expected to work remotely that day. »" },
      { text: "What is suggested about the new building?",
        choices: [
          "It is smaller than the current office.",
          "It is conveniently located near public transportation.",
          "It has no meeting rooms yet.",
          "It will open in June."
        ],
        answer: 1,
        expl: "« Direct access to the Line 4 subway station » → bien desservi par les transports. Inférence typique de la Part 7." }
    ]
  },
  {
    title: "Notice — Extended warranty offer",
    passage: `GREENFIELD APPLIANCES — CUSTOMER NOTICE

Thank you for purchasing a Greenfield appliance. Your product is covered by our standard two-year warranty, which includes parts and labor for any manufacturing defect.

For a limited time, customers who register their product online before April 30 will receive an additional year of coverage at no extra cost. To register, visit www.greenfield.com/register and enter the serial number printed on the back of your appliance, along with your proof of purchase.

Please note that the warranty does not cover damage caused by improper installation, power surges, or use of non-approved accessories. Repairs performed by unauthorized technicians will void the warranty.

For service requests, call our customer hotline at 1-800-555-0142, Monday through Saturday, 8 A.M. to 6 P.M.`,
    questions: [
      { text: "What is offered to customers who register before April 30?",
        choices: [
          "A discount on their next purchase",
          "A free accessory",
          "One extra year of warranty coverage",
          "Free installation of the appliance"
        ],
        answer: 2,
        expl: "« Will receive an additional year of coverage at no extra cost. »" },
      { text: "What do customers need in order to register their product?",
        choices: [
          "A credit card number",
          "The serial number and a proof of purchase",
          "The technician's authorization code",
          "A copy of the standard warranty"
        ],
        answer: 1,
        expl: "« Enter the serial number... along with your proof of purchase. »" },
      { text: "According to the notice, what would void the warranty?",
        choices: [
          "Registering the product online",
          "Calling the customer hotline",
          "Using the appliance every day",
          "Having the appliance repaired by an unauthorized technician"
        ],
        answer: 3,
        expl: "« Repairs performed by unauthorized technicians will void the warranty. » « To void » = annuler, rendre nul." },
      { text: "When can customers call the service hotline?",
        choices: [
          "Every day of the week",
          "Monday through Saturday, from 8 A.M. to 6 P.M.",
          "Only before April 30",
          "Weekdays after 6 P.M."
        ],
        answer: 1,
        expl: "Dernière phrase : « Monday through Saturday, 8 A.M. to 6 P.M. » — le dimanche est exclu." }
    ]
  }
];

// Part 2 : une question lue à voix haute, trois réponses lues à voix haute.
// L'utilisateur choisit A, B ou C sans voir les textes (comme au vrai TOEIC).
const TOEIC_LISTENING = [
  { q: "When does the next train to Boston leave?",
    r: ["At four thirty.", "By train, usually.", "Two tickets, please."], answer: 0,
    expl: "Question en « When » → on attend un horaire. B répond à « how », C répond à une question d'achat." },
  { q: "Where is the accounting department?",
    r: ["Yes, it is.", "On the third floor.", "Every Monday morning."], answer: 1,
    expl: "Question en « Where » → un lieu. « Yes/No » ne répond jamais à une question en WH- : piège récurrent." },
  { q: "Who is leading the meeting today?",
    r: ["In the conference room.", "At ten o'clock.", "Ms. Tanaka is."], answer: 2,
    expl: "Question en « Who » → une personne. A donne un lieu, B un horaire." },
  { q: "Would you like some coffee before we start?",
    r: ["Yes, please.", "In the kitchen.", "No, he doesn't."], answer: 0,
    expl: "Offre polie → acceptation ou refus poli. C utilise « he », incohérent avec « you »." },
  { q: "How long is the flight to Chicago?",
    r: ["By plane.", "About two hours.", "Seat twelve A."], answer: 1,
    expl: "« How long » → une durée. A répond à « how » (moyen), C évoque un siège." },
  { q: "Why was this morning's meeting cancelled?",
    r: ["Because the director is away on business.", "In the meeting room.", "Yes, it was."], answer: 0,
    expl: "« Why » → une cause (« because... »). « Yes/No » est impossible après une question en WH-." },
  { q: "Could you send me the sales report by Friday?",
    r: ["The airport is quite far.", "Sure, no problem.", "Twice a week."], answer: 1,
    expl: "Demande polie → accepter ou refuser. Piège phonétique : « report » / « airport »." },
  { q: "Whose laptop is this on the table?",
    r: ["It's brand new.", "On the desk.", "It's Maria's."], answer: 2,
    expl: "« Whose » → un possesseur (génitif « Maria's »). A décrit l'objet, B donne un lieu." },
  { q: "Have you finished the presentation yet?",
    r: ["Almost — I'll be done by noon.", "Yes, tomorrow.", "It was a gift."], answer: 0,
    expl: "« Yes, tomorrow » est contradictoire (fini... demain ?). « Present/presentation » : piège phonétique en C." },
  { q: "Should we take a taxi or the subway?",
    r: ["Yes, we should.", "At the station.", "The subway is faster."], answer: 2,
    expl: "Question alternative (« or ») → on choisit l'une des options. « Yes/No » est le piège classique des questions en « or »." },
  { q: "What time does the pharmacy close tonight?",
    r: ["At nine P.M.", "Near the bank.", "Some medicine, please."], answer: 0,
    expl: "« What time » → un horaire. B répond à « where », C répond à « what would you like »." },
  { q: "You've met our new client before, haven't you?",
    r: ["No, it's not mine.", "Yes, at the conference last week.", "A new contract."], answer: 1,
    expl: "Question tag → confirmation/infirmation cohérente. A répond à une question de possession." }
];
