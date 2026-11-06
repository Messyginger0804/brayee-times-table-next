/**
 * GIF config: the single place to edit which GIFs the app shows.
 *
 * - Only GIFs listed here are ever used (nothing is fetched at random from GIPHY).
 * - Add/remove entries in GIFS, or tune the behavior in GIF_SETTINGS and the message lists.
 * - Review every GIF at /gifs while running `npm run dev` (404s in production).
 * - `webp` is served first via <picture>; `url` (gif) is the fallback.
 */

export type GifCategory = 'celebrate' | 'streak' | 'levelUp' | 'tryAgain' | 'welcome';

export interface GifEntry {
  id: string;
  /** GIF fallback */
  url: string;
  /** Preferred (smaller) format */
  webp: string;
  /** Used as the image alt text */
  title: string;
  /** GIPHY page, used for the "Powered by GIPHY" credit link */
  page: string;
  /** Why this one was picked (shown on the /gifs review page) */
  why: string;
  gifBytes: number;
  webpBytes: number;
  note?: string;
}

export const GIF_CATEGORIES: GifCategory[] = ['celebrate', 'streak', 'levelUp', 'tryAgain', 'welcome'];

export const GIFS: Record<GifCategory, GifEntry[]> = {
  celebrate: [
    {
      id: "oCO02sFyanXFF68LHW",
      url: "https://i.giphy.com/media/oCO02sFyanXFF68LHW/giphy.gif",
      webp: "https://i.giphy.com/media/oCO02sFyanXFF68LHW/giphy.webp",
      title: "Happy Hi Five GIF by Disney Jr.",
      page: "https://giphy.com/gifs/DisneyJunior-oCO02sFyanXFF68LHW",
      why: "Puppy Dog Pals pups high-five, \"Mission accomplished\"",
      gifBytes: 1864645,
      webpBytes: 843968,
    },
    {
      id: "65HR2UL6nn6XMSUoRA",
      url: "https://i.giphy.com/media/65HR2UL6nn6XMSUoRA/giphy.gif",
      webp: "https://i.giphy.com/media/65HR2UL6nn6XMSUoRA/giphy.webp",
      title: "Happy Scooby Doo GIF by Boomerang Official",
      page: "https://giphy.com/gifs/boomerangtoons-scooby-doo-boomerang-65HR2UL6nn6XMSUoRA",
      why: "Scooby-Doo gang dancing happily",
      gifBytes: 1064391,
      webpBytes: 757004,
    },
    {
      id: "J65pdOUXTyG1q",
      url: "https://i.giphy.com/media/J65pdOUXTyG1q/giphy.gif",
      webp: "https://i.giphy.com/media/J65pdOUXTyG1q/giphy.webp",
      title: "happy fairly oddparents GIF",
      page: "https://giphy.com/gifs/happy-party-J65pdOUXTyG1q",
      why: "Fairly OddParents Cosmo and Wanda cheering in confetti",
      gifBytes: 407260,
      webpBytes: 220736,
    },
    {
      id: "l5D2kKEdXBCiLS1OHJ",
      url: "https://i.giphy.com/media/l5D2kKEdXBCiLS1OHJ/giphy.gif",
      webp: "https://i.giphy.com/media/l5D2kKEdXBCiLS1OHJ/giphy.webp",
      title: "Turtle Piggy GIF by BREAD TREE",
      page: "https://giphy.com/gifs/breadtree-bread-tree-hibreadtree-l5D2kKEdXBCiLS1OHJ",
      why: "Cute pig and turtle cheering with pom-poms",
      gifBytes: 137295,
      webpBytes: 96762,
    },
    {
      id: "1Q9vS91QsmeMkDNBWD",
      url: "https://i.giphy.com/media/1Q9vS91QsmeMkDNBWD/giphy.gif",
      webp: "https://i.giphy.com/media/1Q9vS91QsmeMkDNBWD/giphy.webp",
      title: "dance love GIF by BabyTV",
      page: "https://giphy.com/gifs/babytv-baby-circus-thecircuscomestotown-1Q9vS91QsmeMkDNBWD",
      why: "Cartoon bunnies cheering and dancing on stage",
      gifBytes: 442229,
      webpBytes: 260424,
    },
    {
      id: "QORL3lH6yuk8fzKWcc",
      url: "https://i.giphy.com/media/QORL3lH6yuk8fzKWcc/giphy.gif",
      webp: "https://i.giphy.com/media/QORL3lH6yuk8fzKWcc/giphy.webp",
      title: "Dance GIF by Tonton Friends",
      page: "https://giphy.com/gifs/dance-cute-dancing-QORL3lH6yuk8fzKWcc",
      why: "Cartoon shiba in sunglasses DJing with sparkles",
      gifBytes: 128275,
      webpBytes: 145330,
    },
    {
      id: "QluRVHZAmgWSFEWCQq",
      url: "https://i.giphy.com/media/QluRVHZAmgWSFEWCQq/giphy.gif",
      webp: "https://i.giphy.com/media/QluRVHZAmgWSFEWCQq/giphy.webp",
      title: "Happy We Did It GIF by Dicey Together",
      page: "https://giphy.com/gifs/diceytogether-high-five-teamwork-highfive-QluRVHZAmgWSFEWCQq",
      why: "Two cartoon cats high-fiving, \"high five!\"",
      gifBytes: 792463,
      webpBytes: 291808,
    },
    {
      id: "bdmmfJT2wanks",
      url: "https://i.giphy.com/media/bdmmfJT2wanks/giphy.gif",
      webp: "https://i.giphy.com/media/bdmmfJT2wanks/giphy.webp",
      title: "disney celebration GIF",
      page: "https://giphy.com/gifs/disney-celebration-lights-bdmmfJT2wanks",
      why: "Fireworks over a castle at night",
      gifBytes: 495325,
      webpBytes: 442102,
    },
    {
      id: "3o7aDcuuQSIAZ2aSFa",
      url: "https://i.giphy.com/media/3o7aDcuuQSIAZ2aSFa/giphy.gif",
      webp: "https://i.giphy.com/media/3o7aDcuuQSIAZ2aSFa/giphy.webp",
      title: " ",
      page: "https://giphy.com/gifs/3o7aDcuuQSIAZ2aSFa",
      why: "Cartoon cat and dog cheerleaders with pom-poms",
      gifBytes: 77273,
      webpBytes: 31834,
    },
  ],
  streak: [
    {
      id: "36N8qS0gBT81NOeSaG",
      url: "https://i.giphy.com/media/36N8qS0gBT81NOeSaG/giphy.gif",
      webp: "https://i.giphy.com/media/36N8qS0gBT81NOeSaG/giphy.webp",
      title: "On Fire GIF by Bullish Terriers",
      page: "https://giphy.com/gifs/BullishTerriers-puppy-bull-terrier-bullish-terriers-36N8qS0gBT81NOeSaG",
      why: "Cartoon dog in sunglasses, \"ON FIRE\" with flames",
      gifBytes: 3728807,
      webpBytes: 1350982,
      note: "gif >3MB; prefer webp or 200.gif/giphy-downsized",
    },
    {
      id: "6sq5PZvoRDzmyoI6Pj",
      url: "https://i.giphy.com/media/6sq5PZvoRDzmyoI6Pj/giphy.gif",
      webp: "https://i.giphy.com/media/6sq5PZvoRDzmyoI6Pj/giphy.webp",
      title: "Fire Mood GIF by Bullish Terriers",
      page: "https://giphy.com/gifs/BullishTerriers-puppy-bull-terrier-bullish-terriers-6sq5PZvoRDzmyoI6Pj",
      why: "Cartoon dog in sunglasses by campfire, \"LIT\"",
      gifBytes: 3194441,
      webpBytes: 1456808,
      note: "gif >3MB; prefer webp or 200.gif/giphy-downsized",
    },
    {
      id: "dsflMffdH71Re",
      url: "https://i.giphy.com/media/dsflMffdH71Re/giphy.gif",
      webp: "https://i.giphy.com/media/dsflMffdH71Re/giphy.webp",
      title: "on fire GIF",
      page: "https://giphy.com/gifs/fire-cute-cartoon-dsflMffdH71Re",
      why: "Flame Princess (Adventure Time) swirling in fire",
      gifBytes: 865388,
      webpBytes: 450510,
    },
    {
      id: "11Uej6mhxSPnIk",
      url: "https://i.giphy.com/media/11Uej6mhxSPnIk/giphy.gif",
      webp: "https://i.giphy.com/media/11Uej6mhxSPnIk/giphy.webp",
      title: "Fire Pokemon GIF",
      page: "https://giphy.com/gifs/fire-cartoon-pokemon-11Uej6mhxSPnIk",
      why: "Charizard breathing fire (Pokemon)",
      gifBytes: 192324,
      webpBytes: 80670,
    },
    {
      id: "7yjD8oEtABfTj0cRrD",
      url: "https://i.giphy.com/media/7yjD8oEtABfTj0cRrD/giphy.gif",
      webp: "https://i.giphy.com/media/7yjD8oEtABfTj0cRrD/giphy.webp",
      title: "Well Done Yes GIF by Bullish Terriers",
      page: "https://giphy.com/gifs/BullishTerriers-puppy-bull-terrier-bullish-terriers-7yjD8oEtABfTj0cRrD",
      why: "Cartoon dog with \"GOOD JOB\" and star chart",
      gifBytes: 3069483,
      webpBytes: 1353898,
      note: "gif >3MB; prefer webp or 200.gif/giphy-downsized",
    },
  ],
  levelUp: [
    {
      id: "dJezVlwfVulTykjRQj",
      url: "https://i.giphy.com/media/dJezVlwfVulTykjRQj/giphy.gif",
      webp: "https://i.giphy.com/media/dJezVlwfVulTykjRQj/giphy.webp",
      title: "animated cartoon rocket GIF by Animative",
      page: "https://giphy.com/gifs/animative-animation-cartoon-dJezVlwfVulTykjRQj",
      why: "Cartoon rocket blasting off between clouds",
      gifBytes: 794533,
      webpBytes: 414300,
    },
    {
      id: "86p1DFMuYAC3phu9iY",
      url: "https://i.giphy.com/media/86p1DFMuYAC3phu9iY/giphy.gif",
      webp: "https://i.giphy.com/media/86p1DFMuYAC3phu9iY/giphy.webp",
      title: "Space School GIF by ClassDojo",
      page: "https://giphy.com/gifs/classdojo-katie-mojo-sel-86p1DFMuYAC3phu9iY",
      why: "ClassDojo cartoon rocket launch, \"Launch Day\" sign",
      gifBytes: 704425,
      webpBytes: 163626,
    },
    {
      id: "3o6gEf8Rqj8vYmMGWI",
      url: "https://i.giphy.com/media/3o6gEf8Rqj8vYmMGWI/giphy.gif",
      webp: "https://i.giphy.com/media/3o6gEf8Rqj8vYmMGWI/giphy.webp",
      title: "3d smoke GIF by Tony Babel",
      page: "https://giphy.com/gifs/3o6gEf8Rqj8vYmMGWI",
      why: "Small cartoon rocket lifting off with smoke",
      gifBytes: 529501,
      webpBytes: 174322,
    },
    {
      id: "NofHTv4EZfFATjMxEN",
      url: "https://i.giphy.com/media/NofHTv4EZfFATjMxEN/giphy.gif",
      webp: "https://i.giphy.com/media/NofHTv4EZfFATjMxEN/giphy.webp",
      title: "Dog Go GIF by SOOBOOKZ",
      page: "https://giphy.com/gifs/cartoon-namsee-soobookz-NofHTv4EZfFATjMxEN",
      why: "Cartoon puppy riding a rocket",
      gifBytes: 76843,
      webpBytes: 63662,
    },
    {
      id: "7zn36amNNIJQvqo91l",
      url: "https://i.giphy.com/media/7zn36amNNIJQvqo91l/giphy.gif",
      webp: "https://i.giphy.com/media/7zn36amNNIJQvqo91l/giphy.webp",
      title: "Animation Rocket GIF by European Space Agency - ESA",
      page: "https://giphy.com/gifs/europeanspaceagency-animation-ariane-6-ariane6esa-7zn36amNNIJQvqo91l",
      why: "Animated illustrated rocket launch (ESA)",
      gifBytes: 1596377,
      webpBytes: 228338,
    },
  ],
  tryAgain: [
    {
      id: "wozTmqWHiSltcoDErh",
      url: "https://i.giphy.com/media/wozTmqWHiSltcoDErh/giphy.gif",
      webp: "https://i.giphy.com/media/wozTmqWHiSltcoDErh/giphy.webp",
      title: "You Got This Go Get Em GIF by Pingu",
      page: "https://giphy.com/gifs/pingu-cheers-noot-nootnoot-wozTmqWHiSltcoDErh",
      why: "Pingu penguins, \"Rooting for you\"",
      gifBytes: 1634699,
      webpBytes: 583106,
    },
    {
      id: "lPX7HHVsTcDp5dBN0X",
      url: "https://i.giphy.com/media/lPX7HHVsTcDp5dBN0X/giphy.gif",
      webp: "https://i.giphy.com/media/lPX7HHVsTcDp5dBN0X/giphy.webp",
      title: "You Can Do It GIF by Pingu",
      page: "https://giphy.com/gifs/pingu-noot-go-get-em-nootnoot-lPX7HHVsTcDp5dBN0X",
      why: "Pingu, \"I believe in you!\"",
      gifBytes: 1486349,
      webpBytes: 470362,
    },
    {
      id: "7jfpCjKm5hG4YikJ7F",
      url: "https://i.giphy.com/media/7jfpCjKm5hG4YikJ7F/giphy.gif",
      webp: "https://i.giphy.com/media/7jfpCjKm5hG4YikJ7F/giphy.webp",
      title: "Keep Going You Can Do It GIF by Otto the Otter by GleeSpace",
      page: "https://giphy.com/gifs/gleespace-motivation-keep-going-otto-7jfpCjKm5hG4YikJ7F",
      why: "Cartoon otter with backpack, \"Keep Going!\"",
      gifBytes: 529900,
      webpBytes: 170862,
    },
    {
      id: "qr2Pn7fMU59x1TB5D2",
      url: "https://i.giphy.com/media/qr2Pn7fMU59x1TB5D2/giphy.gif",
      webp: "https://i.giphy.com/media/qr2Pn7fMU59x1TB5D2/giphy.webp",
      title: "Thumbs-Up Yes GIF by SOOBOOKZ",
      page: "https://giphy.com/gifs/cartoon-namsee-soobookz-qr2Pn7fMU59x1TB5D2",
      why: "Cartoon puppy giving a thumbs up",
      gifBytes: 319058,
      webpBytes: 276058,
    },
    {
      id: "XcamhQUykfo1UwGWu2",
      url: "https://i.giphy.com/media/XcamhQUykfo1UwGWu2/giphy.gif",
      webp: "https://i.giphy.com/media/XcamhQUykfo1UwGWu2/giphy.webp",
      title: "Happy You Can Do This GIF by Pudgy Penguins",
      page: "https://giphy.com/gifs/pudgypenguins-motivation-you-got-this-can-do-XcamhQUykfo1UwGWu2",
      why: "Pudgy Penguin with pom-poms, \"YOU GOT THIS!\"",
      gifBytes: 1104058,
      webpBytes: 974346,
    },
    {
      id: "WFtGz8QxAI9FlLI5er",
      url: "https://i.giphy.com/media/WFtGz8QxAI9FlLI5er/giphy.gif",
      webp: "https://i.giphy.com/media/WFtGz8QxAI9FlLI5er/giphy.webp",
      title: "You Can Do It Good Luck GIF by Biteable",
      page: "https://giphy.com/gifs/Biteable-we-got-this-biteable-biteableanimation-WFtGz8QxAI9FlLI5er",
      why: "Animated text \"We got this!\" with sparkles",
      gifBytes: 669660,
      webpBytes: 444474,
    },
    {
      id: "jJEr0ij6PigpRXhG2g",
      url: "https://i.giphy.com/media/jJEr0ij6PigpRXhG2g/giphy.gif",
      webp: "https://i.giphy.com/media/jJEr0ij6PigpRXhG2g/giphy.webp",
      title: "Support Keep Going GIF",
      page: "https://giphy.com/gifs/keep-going-emotional-support-sharkspicious-jJEr0ij6PigpRXhG2g",
      why: "Cute cartoon shark, \"Keep going\"",
      gifBytes: 277634,
      webpBytes: 157400,
    },
    {
      id: "3iXJuYprHu4kaH8fUA",
      url: "https://i.giphy.com/media/3iXJuYprHu4kaH8fUA/giphy.gif",
      webp: "https://i.giphy.com/media/3iXJuYprHu4kaH8fUA/giphy.webp",
      title: "Nice Job Ok GIF by Drawify",
      page: "https://giphy.com/gifs/drawify-3iXJuYprHu4kaH8fUA",
      why: "Simple animated thumbs up",
      gifBytes: 1102085,
      webpBytes: 429406,
    },
  ],
  welcome: [
    {
      id: "GnSopb3KDgiIZdUKgn",
      url: "https://i.giphy.com/media/GnSopb3KDgiIZdUKgn/giphy.gif",
      webp: "https://i.giphy.com/media/GnSopb3KDgiIZdUKgn/giphy.webp",
      title: "Outer Space GIF",
      page: "https://giphy.com/gifs/space-astronaut-national-day-GnSopb3KDgiIZdUKgn",
      why: "Cartoon bear astronaut waving, \"National Space Day!\"",
      gifBytes: 54576,
      webpBytes: 52650,
    },
    {
      id: "CLT5T86CNNK7gFvzkc",
      url: "https://i.giphy.com/media/CLT5T86CNNK7gFvzkc/giphy.gif",
      webp: "https://i.giphy.com/media/CLT5T86CNNK7gFvzkc/giphy.webp",
      title: "Space Exploration GIF by Major Tom",
      page: "https://giphy.com/gifs/majortomagency-space-nasa-astronaut-CLT5T86CNNK7gFvzkc",
      why: "Illustrated astronaut hopping between planets",
      gifBytes: 243873,
      webpBytes: 182988,
    },
    {
      id: "YkhvLoLdz5ov9vsDHG",
      url: "https://i.giphy.com/media/YkhvLoLdz5ov9vsDHG/giphy.gif",
      webp: "https://i.giphy.com/media/YkhvLoLdz5ov9vsDHG/giphy.webp",
      title: "International Space Station Hello GIF by European Space Agency - ESA",
      page: "https://giphy.com/gifs/europeanspaceagency-esagif-mission-beyond-missionbeyondesa-YkhvLoLdz5ov9vsDHG",
      why: "Two real ESA astronauts waving hello from the ISS",
      gifBytes: 1726292,
      webpBytes: 494236,
    },
  ],
};

export const GIF_SETTINGS = {
  /** How long the overlay stays before auto-dismissing (tap also dismisses) */
  dismissMs: 2200,
  /** Chance (0-1) that a plain correct answer shows a celebrate GIF */
  celebrateChance: 0.5,
  /** Minimum gap between GIFs so they never pile up, in ms (milestones ignore this) */
  cooldownMs: 3500,
  /** Show a streak GIF at these streak counts (and every `streakRepeatEvery` after the last one) */
  streakMilestones: [3, 5, 10],
  streakRepeatEvery: 10,
};

/** Short lines shown next to the GIF. Edit freely. */
export const GIF_MESSAGES: Record<GifCategory, string[]> = {
  celebrate: ['Nailed it! ⭐', 'Boom! Great job!', 'Super star! 🌟', 'Yes! Keep going!'],
  streak: ['{n} in a row! 🔥', '{n} in a row! You are on fire!', 'Unstoppable! {n} straight!'],
  levelUp: ['Level complete! 🏆', 'New record! 🚀', 'Mission accomplished! 🎉'],
  tryAgain: ['So close! Try that one again 💪', 'Almost! You got this 💫', 'Oops! Shake it off and go again 🚀'],
  welcome: ['Ready for liftoff? 🚀', 'Welcome back, space explorer! 🌟'],
};
