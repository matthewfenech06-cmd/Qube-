// Builds the inner pages from the homepage's shell, so the head, nav, logo,
// footer and scripts can never drift apart. This file is the source of truth
// for those pages: edit the content here and re-run, do not hand-edit the
// generated HTML.
//   node tools/build-pages.js
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const home = fs.readFileSync(path.join(root, "index.html"), "utf8");
const top = home.slice(0, home.indexOf("<main>") + "<main>".length);
const tail = home.slice(home.indexOf("</main>"));

const WA = "data-wa-quick";
const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;");

function shell(p) {
  let head = top
    .replace(/<title>[\s\S]*?<\/title>/, `<title>${p.title}</title>`)
    .replace(/<meta name="description" content="[^"]*">/, `<meta name="description" content="${p.description}">`)
    .replace(/<meta name="keywords" content="[^"]*">/, `<meta name="keywords" content="${p.keywords}">`)
    .replace(/<link rel="canonical" href="[^"]*">/, `<link rel="canonical" href="https://www.qubemalta.com/${p.slug}.html">`)
    .replace(/<meta property="og:title" content="[^"]*">/, `<meta property="og:title" content="${p.ogTitle || p.title}">`)
    .replace(/<meta property="og:description" content="[^"]*">/, `<meta property="og:description" content="${p.description}">`)
    .replace(/<meta property="og:url" content="[^"]*">/, `<meta property="og:url" content="https://www.qubemalta.com/${p.slug}.html">`)
    .replace(/<body data-page="home">/, `<body data-page="${p.slug}">`)
    // hero-only preloads and the homepage's structured data
    .replace(/<link rel="preload" as="image"[^>]*>\n/g, "")
    .replace(/<script type="application\/ld\+json">[\s\S]*?<\/script>\n/, "");
  return head + "\n" + p.body + "\n" + tail;
}

const pageHero = (kicker, title, lead) => `
  <header class="page-hero">
    <span class="spark spark--a" aria-hidden="true"><svg viewBox="0 0 399.675 288"><use href="#qube-mark"/></svg></span>
    <div class="container">
      <span class="kicker kicker--plain">${kicker}</span>
      <h1 class="display page-hero__title">${title}</h1>
      <p class="lead page-hero__lead">${lead}</p>
    </div>
  </header>`;

const contactCards = `
      <div class="cards">
        <div class="panel">
          <span class="kicker kicker--plain">WhatsApp</span>
          <h3 class="h3">The fastest way</h3>
          <p class="muted">Message the team and get an answer the same night.</p>
          <a href="#" class="btn btn--accent btn--sm" ${WA}>Message us</a>
        </div>
        <div class="panel">
          <span class="kicker kicker--plain">Email</span>
          <h3 class="h3">Write to us</h3>
          <ul class="plain-list">
            <li><a href="mailto:info@qubemalta.com">info@qubemalta.com</a> <span class="muted">general</span></li>
            <li><a href="mailto:booking@qubemalta.com">booking@qubemalta.com</a> <span class="muted">tables</span></li>
          </ul>
        </div>
        <div class="panel">
          <span class="kicker kicker--plain">Phone</span>
          <h3 class="h3">Call the team</h3>
          <ul class="plain-list">
            <li><a href="tel:+35699121802">+356 9912 1802</a> <span class="muted">Cameron</span></li>
          </ul>
        </div>
        <div class="panel">
          <span class="kicker kicker--plain">Find us</span>
          <h3 class="h3">St Rita's Steps</h3>
          <p class="muted">St Julians, Paceville, Malta. In the heart of the strip.</p>
          <a href="https://www.google.com/maps/search/?api=1&amp;query=QUBE+St+Rita%27s+Steps+St+Julians+Malta" target="_blank" rel="noopener" class="textlink">Open in Maps <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14M13 6l6 6-6 6"/></svg></a>
        </div>
      </div>`;

const PHOTOS = [
  ["qube-lounge-01.webp", "The lounge and its lit portal wall", ""],
  ["qube-bar-01.webp", "The bar under the On Air sign", " gallery-item--tall"],
  ["qube-entrance-01.webp", "The crowd on Paceville stairs at the door", ""],
  ["qube-lounge-02.webp", "Red light across the VIP seating", ""],
  ["qube-paceville-01.webp", "Paceville on a full night", ""],
  ["qube-bar-02.webp", "Drinks at the bar", " gallery-item--tall"],
  ["qube-lounge-03.webp", "Moving lights over the floor", ""],
  ["qube-entrance-02.webp", "Outside QUBE on the steps", ""],
  ["qube-lounge-04.webp", "The room in full QUBE colour", ""],
];

const FILMS = [
  ["bar", "Floor 1", "9:16"],
  ["lounge", "Floor 2", "16:9"],
  ["steps", "The Venue", "16:9"],
  ["paceville", "Paceville", "16:9"],
];

const pages = [
  {
    slug: "whats-on",
    title: "What's On | QUBE Nightclub Paceville",
    description: "Guest nights, line-ups and table drops at QUBE, Malta's multi-story nightclub in Paceville. Announcements land here first.",
    keywords: "Paceville events, Malta nightlife events, QUBE Malta what's on",
    body: `${pageHero("The Calendar", "What's On", "Four floors, one night in Paceville. Line-ups and guest nights land here first.")}

  <section class="section section--tight">
    <div class="container">
      <div class="band" data-scrub="zoom">
        <div class="band__glow" aria-hidden="true"></div>
        <span class="kicker kicker--plain" style="justify-content:center">Announcements</span>
        <h2 class="h2" style="margin:1rem auto 0;max-width:18ch">Line-Ups Land Here First</h2>
        <p class="lead" style="margin:1rem auto 0">Nothing is on the calendar right now. The moment a guest night is confirmed it goes up here, so follow along or send us a message to hear it first.</p>
        <div class="btn-row">
          <a href="https://instagram.com/qubemalta" target="_blank" rel="noopener" class="btn btn--primary">Follow On Instagram</a>
          <a href="#" class="btn btn--ghost" ${WA}>WhatsApp Us</a>
        </div>
      </div>
    </div>
  </section>

  <!-- ADDING AN EVENT: copy this block into the .events grid below and fill it in.
       data-tags drives the filter pills, so keep one of: floor-1, floor-2, venue.
  <article class="event reveal" data-tags="floor-1">
    <div class="event__media"><img src="assets/photos/qube-lounge-01.webp" alt="" loading="lazy"></div>
    <div class="event__body">
      <span class="event__floor">Floor 1</span>
      <h3 class="h3">Event name</h3>
      <p class="event__date">Saturday 00 Month - Doors 23:00</p>
      <p class="muted">One line about the night.</p>
      <div class="event__foot"><a href="bookings.html" class="btn btn--accent btn--sm">Book A Table</a></div>
    </div>
  </article>
  -->

  <section class="section section--tight">
    <div class="container">
      <div class="section__head section__head--split reveal" data-reveal="clip">
        <div>
          <span class="kicker">In The Meantime</span>
          <h2 class="h2" style="margin-top:1rem">Every Night, Four Floors</h2>
        </div>
        <a href="gallery.html" class="textlink">See Inside <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14M13 6l6 6-6 6"/></svg></a>
      </div>
      <p class="lead">QUBE runs across four floors in the middle of Paceville, from the bar through to the rooms upstairs. Tables can be reserved on any of them, and the team will tell you what is open on the night you are coming.</p>
      <div class="btn-row" style="margin-top:2rem">
        <a href="bookings.html" class="btn btn--primary">Book A Table</a>
        <a href="vip-tables.html" class="btn btn--ghost">VIP Tables</a>
      </div>
    </div>
  </section>

  <section class="section section--tight">
    <div class="container" style="text-align:center" data-scrub="zoom">
      <span class="kicker kicker--plain" style="justify-content:center">Stay In The Loop</span>
      <h2 class="h3" style="margin-top:1rem">Get Event Drops First</h2>
      <form class="subscribe" data-newsletter>
        <input type="email" required placeholder="Your email address" aria-label="Email address">
        <button type="submit" class="btn btn--accent">Sign Up</button>
      </form>
      <p class="form-ok">You're on the list. See you on the floor.</p>
    </div>
  </section>`,
  },

  {
    slug: "vip-tables",
    title: "VIP Tables | QUBE Nightclub Paceville",
    description: "Reserve a VIP table at QUBE in Paceville, Malta. Tables on every floor, confirmed by the team over WhatsApp or email.",
    keywords: "VIP tables Paceville, bottle service Malta, QUBE table booking",
    body: `${pageHero("Tables", "VIP Tables", "Your table, your floor, your night. Tell us what you need and the team sorts the rest.")}

  <section class="section section--tight">
    <div class="container">
      <div class="section__head reveal" data-reveal="clip">
        <span class="kicker">How It Works</span>
        <h2 class="h2" style="margin-top:1rem">Three Steps</h2>
      </div>
      <div class="floors">
        <div class="floor">
          <span class="floor__idx">01</span>
          <div><h3 class="floor__name">Send A Message</h3><p class="floor__desc">Use the form below or message us on WhatsApp. It reaches the team directly.</p></div>
          <span class="floor__link">Fastest</span>
        </div>
        <div class="floor">
          <span class="floor__idx">02</span>
          <div><h3 class="floor__name">Tell Us The Night</h3><p class="floor__desc">The date, how many of you there are, and the floor you have in mind.</p></div>
          <span class="floor__link">Your call</span>
        </div>
        <div class="floor">
          <span class="floor__idx">03</span>
          <div><h3 class="floor__name">We Confirm</h3><p class="floor__desc">The team comes back with what is available and holds your table.</p></div>
          <span class="floor__link">Done</span>
        </div>
      </div>
    </div>
  </section>

  <section class="section section--tight">
    <div class="container statement">
      <div data-scrub="slideL">
        <span class="kicker">Enquire</span>
        <h2 class="h2" style="margin-top:1rem">Request A Table</h2>
        <p class="lead">Table options and bottle lists are confirmed by the team when you enquire, so you always get what is actually available on the night.</p>
        <p class="muted">Prefer email? <a class="textlink" href="mailto:booking@qubemalta.com">booking@qubemalta.com</a></p>
      </div>
      <div class="panel reveal" data-reveal="scale">
        <form class="form-grid" data-wa-form="I'd like to request a VIP table">
          <div class="field"><label for="vt-name">Name</label><input id="vt-name" name="Name" required></div>
          <div class="field"><label for="vt-date">Date</label><input id="vt-date" name="Date" type="date" required></div>
          <div class="field"><label for="vt-guests">Guests</label><input id="vt-guests" name="Guests" type="number" min="1" max="60" required></div>
          <div class="field"><label for="vt-floor">Floor</label><select id="vt-floor" name="Floor"><option>Any floor</option><option>Floor 1</option><option>Floor 2</option></select></div>
          <div class="field full"><label for="vt-occasion">Occasion</label><input id="vt-occasion" name="Occasion" placeholder="Birthday, stag, just out"></div>
          <div class="field full"><label for="vt-notes">Anything else</label><textarea id="vt-notes" name="Notes" rows="3"></textarea></div>
          <div class="field full"><button type="submit" class="btn btn--accent btn--block">Send On WhatsApp</button></div>
        </form>
        <p class="form-ok">Sent. The team will come back to you shortly.</p>
        <p class="form-note">The form opens WhatsApp with your details filled in, so nothing is stored on this site.</p>
      </div>
    </div>
  </section>

  <section class="section section--tight">
    <div class="container">${contactCards}</div>
  </section>`,
  },

  {
    slug: "gallery",
    title: "Gallery | QUBE Nightclub Paceville",
    description: "Inside QUBE: the bar, the lounge, the lit portal wall and the crowd on Paceville stairs.",
    keywords: "QUBE Malta photos, Paceville nightclub gallery, nightclub Malta inside",
    body: `${pageHero("Inside QUBE", "Gallery", "The rooms, the lights, and the strip right outside the door.")}

  <section class="section section--tight">
    <div class="container">
      <div class="gallery">
        ${PHOTOS.map(([file, alt, mod]) => `<figure class="gallery-item${mod} reveal" data-reveal="scale">
          <img src="assets/photos/${file}" alt="${esc(alt)}" loading="lazy" decoding="async">
        </figure>`).join("\n        ")}
      </div>
    </div>
  </section>

  <section class="section section--tight">
    <div class="container">
      <div class="section__head reveal" data-reveal="clip">
        <span class="kicker">On Film</span>
        <h2 class="h2" style="margin-top:1rem">Moving Pictures</h2>
      </div>
      <div class="films">
        ${FILMS.map(([slug, name, aspect]) => `<figure class="film${aspect === "9:16" ? " film--tall" : ""}">
          <video src="assets/video/planet-${slug}.mp4" poster="assets/video/planet-${slug}.webp" muted loop playsinline controls preload="none"></video>
          <figcaption>${name}</figcaption>
        </figure>`).join("\n        ")}
      </div>
      <div class="btn-row" style="margin-top:2.4rem">
        <a href="bookings.html" class="btn btn--primary">Book A Table</a>
        <a href="#" class="btn btn--ghost" ${WA}>WhatsApp Us</a>
      </div>
    </div>
  </section>

  <div class="lightbox" aria-hidden="true">
    <button class="lightbox__close" type="button" aria-label="Close">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>
    </button>
    <div class="lightbox__content"></div>
  </div>`,
  },

  {
    slug: "about",
    title: "About | QUBE Nightclub Paceville",
    description: "QUBE was a one-floor bar in Paceville for three decades. It has been rebuilt as Malta's multi-story nightclub. Rebranded, revived, refined.",
    keywords: "QUBE Malta history, Paceville nightclub, Trinvest Limited",
    body: `${pageHero("The Story", "30 Years. Reimagined.", "A Paceville name that has been part of Malta's nights for three decades, rebuilt from the ground up.")}

  <section class="section section--tight">
    <div class="container statement">
      <div data-scrub="slideL">
        <span class="kicker">Then</span>
        <h2 class="h2" style="margin-top:1rem">One Floor, Thirty Years</h2>
        <p class="lead">For three decades QUBE was a beloved one-floor bar in the heart of Paceville, the kind of place everyone on the island had a night in at least once.</p>
        <p class="lead">It has now been rebuilt from the ground up: four floors, one name, and an experience unlike anything Malta has seen. Rebranded, revived and refined.</p>
        <a href="gallery.html" class="textlink">See Inside <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14M13 6l6 6-6 6"/></svg></a>
      </div>
      <figure class="statement__media reveal" data-reveal="scale">
        <img src="assets/photos/qube-lounge-04.webp" alt="Inside QUBE Nightclub" loading="lazy" decoding="async">
      </figure>
    </div>
  </section>

  <section class="section section--tight">
    <div class="container stats stagger">
      <div class="stat" data-scrub="zoom"><span class="stat__num accent" data-count="4" data-pad="2">04</span><span class="stat__label">Floors, One Roof</span></div>
      <div class="stat" data-scrub="zoom"><span class="stat__num accent" data-count="30">30</span><span class="stat__label">Years Reimagined</span></div>
      <div class="stat" data-scrub="zoom"><span class="stat__num accent" data-count="1" data-pad="2">01</span><span class="stat__label">Iconic Name</span></div>
    </div>
  </section>

  <section class="section section--tight">
    <div class="container">
      <div class="band" data-scrub="zoom">
        <div class="band__glow" aria-hidden="true"></div>
        <span class="kicker kicker--plain" style="justify-content:center">Find Us</span>
        <h2 class="h2" style="margin:1rem auto 0;max-width:16ch">St Rita's Steps, Paceville</h2>
        <p class="lead" style="margin:1rem auto 0">In the middle of St Julians, a few steps off the strip.</p>
        <div class="btn-row">
          <a href="bookings.html" class="btn btn--primary">Book A Table</a>
          <a href="contact.html" class="btn btn--ghost">Contact</a>
        </div>
      </div>
    </div>
  </section>`,
  },

  {
    slug: "contact",
    title: "Contact | QUBE Nightclub Paceville",
    description: "Contact QUBE Nightclub in Paceville, St Julians: WhatsApp, info@qubemalta.com, booking@qubemalta.com, or call the team.",
    keywords: "QUBE Malta contact, Paceville nightclub phone, nightclub Malta email",
    body: `${pageHero("Say Hello", "Contact", "Message, call or email. The quickest answer is always WhatsApp.")}

  <section class="section section--tight">
    <div class="container">${contactCards}</div>
  </section>

  <section class="section section--tight">
    <div class="container statement">
      <div data-scrub="slideL">
        <span class="kicker">Enquiries</span>
        <h2 class="h2" style="margin-top:1rem">Send A Message</h2>
        <p class="lead">Tables, guest lists, press or anything else. Tell us what you need and the team picks it up.</p>
        <p class="muted">For table bookings you can also go straight to <a class="textlink" href="bookings.html">the booking form</a>.</p>
      </div>
      <div class="panel reveal" data-reveal="scale">
        <form class="form-grid" data-wa-form="I have an enquiry">
          <div class="field full"><label for="c-name">Name</label><input id="c-name" name="Name" required></div>
          <div class="field full"><label for="c-about">What is it about</label><select id="c-about" name="About"><option>General</option><option>Table booking</option><option>Private hire</option><option>Press or partnership</option></select></div>
          <div class="field full"><label for="c-msg">Message</label><textarea id="c-msg" name="Message" rows="4" required></textarea></div>
          <div class="field full"><button type="submit" class="btn btn--accent btn--block">Send On WhatsApp</button></div>
        </form>
        <p class="form-ok">Sent. We'll be in touch shortly.</p>
        <p class="form-note">The form opens WhatsApp with your message ready to send, so nothing is stored on this site.</p>
      </div>
    </div>
  </section>`,
  },

  {
    slug: "bookings",
    title: "Book A Table | QUBE Nightclub Paceville",
    description: "Book a table at QUBE Nightclub in Paceville, Malta. Send your night and party size and the team confirms by message.",
    keywords: "book table Paceville, QUBE Malta bookings, nightclub reservation Malta",
    body: `${pageHero("Reservations", "Book A Table", "Tell us the night and the size of your party. The team confirms by message.")}

  <section class="section section--tight">
    <div class="container statement">
      <div class="panel reveal" data-reveal="scale">
        <form class="form-grid" data-wa-form="I'd like to book a table">
          <div class="field"><label for="b-name">Name</label><input id="b-name" name="Name" required></div>
          <div class="field"><label for="b-phone">Phone</label><input id="b-phone" name="Phone" type="tel" inputmode="tel"></div>
          <div class="field"><label for="b-date">Date</label><input id="b-date" name="Date" type="date" required></div>
          <div class="field"><label for="b-guests">Guests</label><input id="b-guests" name="Guests" type="number" min="1" max="60" required></div>
          <div class="field"><label for="b-floor">Floor</label><select id="b-floor" name="Floor"><option>Any floor</option><option>Floor 1</option><option>Floor 2</option></select></div>
          <div class="field"><label for="b-occasion">Occasion</label><input id="b-occasion" name="Occasion" placeholder="Birthday, stag, just out"></div>
          <div class="field full"><label for="b-notes">Anything else</label><textarea id="b-notes" name="Notes" rows="3"></textarea></div>
          <div class="field full"><button type="submit" class="btn btn--accent btn--block">Send On WhatsApp</button></div>
        </form>
        <p class="form-ok">Sent. The team will confirm your table shortly.</p>
        <p class="form-note">The form opens WhatsApp with your details filled in, so nothing is stored on this site.</p>
      </div>
      <div data-scrub="slideR">
        <span class="kicker">Other Ways</span>
        <h2 class="h3" style="margin-top:1rem">Rather Not Fill A Form?</h2>
        <p class="lead">Message or call the team directly. Either way you are talking to the same people.</p>
        <ul class="plain-list plain-list--lg">
          <li><a href="#" ${WA}>WhatsApp the team</a></li>
          <li><a href="mailto:booking@qubemalta.com">booking@qubemalta.com</a></li>
          <li><a href="tel:+35699121802">+356 9912 1802</a> <span class="muted">Cameron</span></li>
        </ul>
        <p class="muted">QUBE is on St Rita's Steps in Paceville, St Julians.</p>
      </div>
    </div>
  </section>

  <div class="sticky-bar on">
    <a href="#" class="btn btn--accent btn--block" ${WA}>Book On WhatsApp</a>
  </div>`,
  },
];

for (const p of pages) {
  const out = shell(p);
  fs.writeFileSync(path.join(root, `${p.slug}.html`), out);
  console.log(`${p.slug}.html  ${(out.length / 1024).toFixed(1)} KB`);
}
