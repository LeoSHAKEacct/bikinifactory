/* Pranav's own content for the site. Fill a list and its section appears; empty lists stay hidden
   (the reels wall shows an Instagram card until reels are added). Only real items: real projects,
   real clients (with their permission) and deals Pranav is happy to show publicly. */
window.PRANAV_CONTENT = {
  // Next exclusive launch: a countdown and a "get the brochure first" list. null = no launch panel.
  // e.g. { name: "Project name", area: "Dubai Hills", date: "2027-02-15T18:00:00+04:00", from: "AED 1.4M",
  //        plan: "60/40", blurb: "One short line about it.", image: "/launch.jpg" }
  launch: null,

  // Construction diary, newest first: { date: "Mar 2026", project: "Project name", stage: "Ground-breaking",
  //   text: "One or two lines.", image: "/diary/1.jpg" }
  diary: [],

  // Instagram reel or post links, e.g. "https://www.instagram.com/reel/ABC123xyz/"
  reels: [],

  // Client voices: { name: "First name, country", text: "What they said.", role: "Bought in Dubai Marina" }
  voices: [],

  // Pranav's market takes, newest first: { date: "Nov 2026", title: "Crash or correction?", text: "Short take.", link: "" }
  takes: [],

  // Closed deals for the ticker on the opening screen, e.g. "3-bed · Dubai Marina · AED 4.2M · closed"
  deals: [],
};
