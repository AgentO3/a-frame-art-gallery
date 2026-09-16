import "@fontsource/manrope/latin-400.css";
import "@fontsource/manrope/latin-500.css";
import "@fontsource/manrope/latin-600.css";
import "@fontsource/cormorant-garamond/latin-400.css";
import "@fontsource/cormorant-garamond/latin-400-italic.css";
import "./style.css";
import artworks, { rooms } from "virtual:collection";

const arrow =
  '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M4 12h15m-6-6 6 6-6 6" stroke="currentColor" stroke-width="1.5"/></svg>';
const diagonal =
  '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M6 18 18 6M6 6h12v12" stroke="currentColor" stroke-width="1.5"/></svg>';
const heart =
  '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 5c-2-2-6-2-8 1-2-3-6-3-8-1-3 3-1 6 1 8l7 7 7-7c2-2 4-5 1-8Z" fill="none" stroke="currentColor" stroke-width="1.4"/></svg>';
const escape = (s) =>
  String(s).replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
const work = (id) => artworks.find((a) => a.id === id) || artworks[0];
const editorial = {
  "crystal-city":
    "A familiar skyline dissolves into crystalline patterns. Architecture becomes a landscape of light, reflection, and impossible geometry.",
  "flaming-shore":
    "An ordinary shoreline takes on an otherworldly glow. Color moves like heat through the landscape, blurring the boundary between memory and dream.",
  "sherbert-land":
    "A world rendered in unexpected color. Soft, candy-colored forms invite a second look at the landscapes we think we know.",
  "london-flowers":
    "Botanical forms unfurl into intricate, repeating patterns. A garden becomes a conversation between organic growth and digital imagination.",
  "a-private-swim":
    "A quiet escape, reimagined. Familiar shapes drift into a dreamlike scene that rewards slow looking.",
  bug: "The small and familiar becomes strange and extraordinary. Layered patterns reveal a different kind of natural world.",
  "goat-peak":
    "A mountain landscape transformed by layers of texture. The contours of the natural world become something newly unfamiliar.",
  "burger-n-shake":
    "An everyday scene becomes a study in transformation. Familiar details give way to playful patterns and unexpected textures.",
};
let saved;
try {
  saved = new Set(
    JSON.parse(localStorage.getItem("roomkey:saved") || "[]").filter((id) =>
      artworks.some((a) => a.id === id),
    ),
  );
} catch {
  saved = new Set();
}
let savedOnly = false;
let activeIndex = 0;
let returnFocus;
let gallery;
let immersiveOpening = false;
let galleryRoom =
  rooms.find(
    (room) => room.id === new URLSearchParams(location.search).get("gallery"),
  ) || rooms.find((room) => artworks.some((art) => art.room === room.title));
let roomArtworks = artworks.filter((art) => art.room === galleryRoom.title);
const hero = work("crystal-city");
const secondary = work("flaming-shore");

document.querySelector("#app").innerHTML = `
  <header class="site-header">
    <a class="wordmark" href="#" aria-label="Roomkey home"><span class="brand-symbol">r.</span>roomkey<span class="brand-star">✳</span></a>
    <nav aria-label="Main navigation"><a class="nav-exhibition" href="#exhibition">Exhibition</a><a href="#collection">The collection</a><a href="#about">Our story</a></nav>
    <button class="saved-nav" aria-label="Show saved artworks" aria-pressed="false">${heart}<span class="saved-label">Your collection</span><span id="saved-count">${saved.size}</span></button>
  </header>
  <main>
    <section class="hero" id="exhibition" aria-labelledby="hero-title">
      <div class="hero-copy"><div class="eyebrow"><span class="live-dot"></span> AN INDEPENDENT DIGITAL ART SPACE</div>
        <h1 id="hero-title">A different<br>state of <em>art.</em><span class="title-star" aria-hidden="true">✳</span></h1>
        <p>A little human imagination.<br>A little machine dreaming.<br>A whole new way to see.</p>
        <div class="hero-actions"><button class="button button-light" data-enter>Step inside the gallery ${diagonal}</button><a class="text-link" href="#collection">Explore the works ${arrow}</a></div>
        <div class="hero-note"><span class="tiny-orbit" aria-hidden="true">◎</span> An immersive experience. Open to everyone.</div>
      </div>
      <div class="hero-art" aria-label="Featured works from the exhibition">
        <span class="art-orbit orbit-one"></span><span class="art-orbit orbit-two"></span>
        <span class="art-index">FIG. 01 / THE ROOMKEY COLLECTION</span>
        <button class="hero-frame frame-main" data-work="${hero.id}" aria-label="View ${escape(hero.title)}"><img src="${hero.image}" alt="${escape(hero.title)} — a dreamlike blue and gold city reflected in water" fetchpriority="high" width="${hero.width}" height="${hero.height}"></button>
        <button class="hero-frame frame-secondary" data-work="${secondary.id}" aria-label="View ${escape(secondary.title)}"><img src="${secondary.image}" alt="${escape(secondary.title)} — a vivid, transformed shoreline" width="${secondary.width}" height="${secondary.height}"></button>
        <div class="art-stamp"><span>LOOK A LITTLE</span><i>closer.</i><span>THERE'S MORE HERE</span></div>
        <div class="hero-art-caption"><span>${escape(hero.title)} <i>by ${escape(hero.artist)}</i></span><span>2020 ${diagonal}</span></div>
      </div>
      <a href="#collection" class="scroll-cue"><span>SCROLL TO DISCOVER</span><span>↓</span></a>
    </section>
    <div class="exhibition-strip"><span><span class="live-dot"></span> NOW ON VIEW</span><p>Between the real & the imagined</p><span>${String(artworks.length).padStart(2, "0")} WORKS <i>·</i> ONE SHARED EXPERIMENT</span><a href="#about" aria-label="Read about the exhibition">${diagonal}</a></div>
    <section class="collection section-wrap" id="collection" aria-labelledby="collection-title">
      <div class="section-heading"><div><span class="eyebrow">THE ROOMKEY COLLECTION / 2020</span><h2 id="collection-title">Ordinary worlds.<br><em>Extraordinary visions.</em></h2></div><p>Familiar places, seen through a different lens.<br>Explore eight experiments in human creativity<br>and the art of the unexpected.</p></div>
      <div class="collection-tools"><div class="filter-tabs" aria-label="Collection filter"><button class="active" data-filter="all" aria-pressed="true">All works <span>${artworks.length.toString().padStart(2, "0")}</span></button><button data-filter="saved" aria-pressed="false">Saved ${heart}</button></div><label class="artist-select">ARTIST <select id="artist" aria-label="Filter by artist"><option value="all">All artists</option>${[...new Set(artworks.map((a) => a.artist))].map((a) => `<option>${escape(a)}</option>`).join("")}</select></label></div>
      <p class="visually-hidden" id="collection-status" role="status" aria-live="polite"></p>
      <div class="artwork-grid" id="artwork-grid"></div>
      <div class="collection-end"><span>MADE WITH CURIOSITY. BEST VIEWED WITH IT, TOO.</span><span>✳</span></div>
    </section>
    <section class="invitation section-wrap" aria-labelledby="invitation-title"><div class="architectural-art" aria-hidden="true"><div class="arch arch-back"></div><div class="arch arch-front"><img src="${work("london-flowers").image}" alt="" loading="lazy"></div><div class="gallery-floor"></div><span class="architectural-label">A SPACE TO GET LOST IN.</span></div><div class="invitation-copy"><span class="eyebrow">BEYOND THE FRAME</span><h2 id="invitation-title">Art deserves<br>a little <em>space.</em></h2><p>Leave the page behind. Wander through the collection in an immersive, three-dimensional gallery. Take your time. Find your perspective.</p><button class="button button-dark" data-enter>Enter the virtual gallery ${diagonal}</button><span class="invitation-note">On your screen. Or in VR. Always free.</span></div></section>
    <section class="about section-wrap" id="about"><span class="eyebrow">A NOTE FROM ROOMKEY</span><h2>What happens when<br><em>curiosity</em> takes the lead?</h2><div class="about-bottom"><span class="about-star" aria-hidden="true">✳</span><div><p>This collection began with a simple experiment at a Roomkey hackathon: what could we make if we let human creativity and machine imagination meet?</p><p>Using multiple passes through Deep Dream Generator, followed by a human touch in Photoshop, familiar photographs became something entirely their own. Eight works. Different perspectives. One shared sense of possibility.</p><a class="text-link" href="https://github.com/AgentO3/a-frame-art-gallery" target="_blank" rel="noopener noreferrer">An open-source space for art ${diagonal}</a></div></div></section>
  </main>
  <footer class="site-footer"><a class="wordmark" href="#">roomkey<span class="brand-star">✳</span></a><span>HUMAN CURIOSITY. DIGITAL POSSIBILITY.</span><a href="#exhibition">Back to the beginning ↑</a></footer>
  <dialog id="art-dialog" aria-labelledby="detail-title"><div class="detail-top"><span>THE ROOMKEY COLLECTION</span><button class="icon-button close-detail" aria-label="Close artwork">✕</button></div><div class="detail-layout"><div class="detail-image-wrap"><img id="detail-image" alt=""></div><div class="detail-copy"><span class="eyebrow" id="detail-number"></span><h2 id="detail-title"></h2><p id="detail-artist"></p><p id="detail-description"></p><dl><div><dt>YEAR</dt><dd id="detail-year"></dd></div><div><dt>PROCESS</dt><dd>Deep Dream & digital editing</dd></div><div><dt>COLLECTION</dt><dd id="detail-room"></dd></div></dl><button class="button save-detail">${heart}<span>Save to your collection</span></button><p class="save-note">Saved in this browser, just for you.</p></div></div><div class="detail-bottom"><button id="previous-art">← <span>Previous work</span></button><span id="detail-pagination"></span><button id="next-art"><span>Next work</span> →</button></div></dialog>
  <dialog id="gallery-dialog" aria-labelledby="gallery-title">
    <div class="gallery-header">
      <div><span class="eyebrow">ROOMKEY / IMMERSIVE GALLERY</span><h2 id="gallery-title">Between the real & the imagined</h2><p class="gallery-motto">EXPLORE <i>·</i> DISCOVER <i>·</i> EXPERIENCE</p></div>
      <div class="gallery-header-actions"><button id="open-gallery-guide"><kbd>TAB</kbd> Gallery Guide</button><button class="icon-button" id="leave-gallery" aria-label="Leave virtual gallery">✕</button></div>
    </div>
    <div id="scene-host"></div>
    <div id="gallery-loading" role="status"><span class="loading-orbit"></span><h3>A little room for imagination.</h3><p>Preparing your gallery…</p></div>
    <div class="gallery-controls"><button id="gallery-prev" aria-label="Visit previous artwork">‹</button><div><span id="gallery-work-title">The collection</span><span id="gallery-position">1 / ${artworks.length}</span></div><button id="gallery-next" aria-label="Visit next artwork">›</button><button id="gallery-inspect" aria-label="View artwork">View artwork <kbd>E</kbd></button><button id="enter-vr" hidden>Enter VR</button></div>
    <div class="gallery-location"><svg viewBox="0 0 24 32" aria-hidden="true"><path d="M12 1A11 11 0 0 0 1 12c0 8 11 19 11 19s11-11 11-19A11 11 0 0 0 12 1m0 6a5 5 0 1 1 0 10 5 5 0 0 1 0-10"/></svg><div><span id="gallery-location-name">Roomkey Gallery</span><small>THE COLLECTION</small></div></div>
    <button id="gallery-walk-pad" aria-label="Hold and drag to walk"><span aria-hidden="true">✥</span><small>WALK</small></button>
    <p class="gallery-hint"><span class="walk-keys">W A S D</span> Walk <i></i> Drag to look <i></i> <kbd>ESC</kbd> Menu</p>
  </dialog>
  <dialog id="gallery-guide" aria-labelledby="gallery-guide-title"><span class="eyebrow">ROOMKEY / GALLERY GUIDE</span><h2 id="gallery-guide-title">Make yourself at home.</h2><p>Take your time. Every work has a story.</p><dl><div><dt><kbd>W A S D</kbd> / <kbd>↑ ← ↓ →</kbd></dt><dd>Walk through the room</dd></div><div><dt>Drag</dt><dd>Look around</dd></div><div><dt><kbd>E</kbd> or click a painting</dt><dd>View the artwork and its story</dd></div><div><dt>‹ / › below</dt><dd>Visit every work, one at a time</dd></div><div><dt><kbd>Esc</kbd></dt><dd>Pause and open this guide</dd></div></dl><button id="resume-gallery" class="button button-light">Back to the gallery →</button><button id="guide-leave-gallery" class="guide-leave">Return to the collection</button></dialog>
  <div id="toast" role="status" aria-live="polite"></div>
`;

const grid = document.querySelector("#artwork-grid");
const detailDialog = document.querySelector("#art-dialog");
const galleryDialog = document.querySelector("#gallery-dialog");
const galleryGuide = document.querySelector("#gallery-guide");
function openGalleryGuide() {
  if (!galleryDialog.open || detailDialog.open || galleryGuide.open) return;
  gallery?.pause();
  galleryGuide.showModal();
}
function closeGalleryGuide() {
  galleryGuide.close();
  if (galleryDialog.open) {
    gallery?.resume();
    document.querySelector("a-scene canvas")?.focus({ preventScroll: true });
  }
}
document.querySelector("#open-gallery-guide").onclick = openGalleryGuide;
document.querySelector("#resume-gallery").onclick = closeGalleryGuide;
document.querySelector("#guide-leave-gallery").onclick = () => {
  galleryGuide.close();
  closeGallery();
};
galleryGuide.addEventListener("cancel", (event) => {
  event.preventDefault();
  closeGalleryGuide();
});
const roomSwitch = document.createElement("label");
roomSwitch.className = "gallery-room-switch";
roomSwitch.hidden = rooms.length < 2;
roomSwitch.innerHTML = `ROOM <select id="gallery-room" aria-label="Choose gallery room">${rooms.map((room) => `<option value="${room.id}" ${room.id === galleryRoom.id ? "selected" : ""}>${escape(room.title)}</option>`).join("")}</select>`;
document.querySelector(".gallery-header > div").append(roomSwitch);
document.querySelector("#gallery-room").addEventListener("change", (event) => {
  galleryRoom = rooms.find((room) => room.id === event.target.value);
  roomArtworks = artworks.filter((art) => art.room === galleryRoom.title);
  gallery?.destroy();
  gallery = undefined;
  history.replaceState(
    null,
    "",
    `${location.pathname}?gallery=${galleryRoom.id}`,
  );
  openGallery();
});
if (matchMedia("(pointer: coarse)").matches)
  document.querySelector(".gallery-hint").textContent =
    "Drag to look · Use the pad to walk · ‹ › to visit each work";
const walkPad = document.querySelector("#gallery-walk-pad");
let walkPointer;
function updateWalkPad(event) {
  if (event.pointerId !== walkPointer) return;
  const bounds = walkPad.getBoundingClientRect();
  let x = (event.clientX - bounds.left - bounds.width / 2) / 28;
  let y = (event.clientY - bounds.top - bounds.height / 2) / 28;
  const magnitude = Math.max(1, Math.hypot(x, y));
  x /= magnitude;
  y /= magnitude;
  gallery?.setWalkInput(x, y);
  walkPad.firstElementChild.style.transform = `translate(${x * 19}px, ${y * 19}px)`;
}
function resetWalkPad() {
  walkPointer = undefined;
  gallery?.setWalkInput(0, 0);
  walkPad.firstElementChild.style.transform = "";
}
walkPad.addEventListener("pointerdown", (event) => {
  if (!event.isPrimary) return;
  event.preventDefault();
  walkPointer = event.pointerId;
  walkPad.setPointerCapture(walkPointer);
  updateWalkPad(event);
});
walkPad.addEventListener("pointermove", updateWalkPad);
walkPad.addEventListener("pointerup", resetWalkPad);
walkPad.addEventListener("pointercancel", resetWalkPad);
walkPad.addEventListener("lostpointercapture", resetWalkPad);
window.addEventListener("blur", resetWalkPad);
let toastTimer;
function toast(message) {
  const el = document.querySelector("#toast");
  el.textContent = message;
  el.classList.add("visible");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove("visible"), 2800);
}
function renderCollection() {
  const artist = document.querySelector("#artist").value;
  const visible = artworks.filter(
    (a) =>
      (!savedOnly || saved.has(a.id)) &&
      (artist === "all" || a.artist === artist),
  );
  grid.innerHTML = visible.length
    ? visible
        .map(
          (a) =>
            `<article class="artwork-card"><div class="artwork-image"><button class="artwork-open" data-work="${a.id}" aria-label="View ${escape(a.title)}"><img src="${a.image}" alt="${escape(a.title)}" width="${a.width}" height="${a.height}" loading="lazy"><span class="view-work">View work ${diagonal}</span></button><button class="save-art ${saved.has(a.id) ? "is-saved" : ""}" data-save="${a.id}" aria-label="Save ${escape(a.title)}" aria-pressed="${saved.has(a.id)}">${heart}</button></div><div class="artwork-caption"><div><h3><button data-work="${a.id}">${escape(a.title)}</button></h3><p>${escape(a.artist)}</p></div><span>${a.created}</span></div></article>`,
        )
        .join("")
    : `<div class="empty-state"><span>♡</span><h3>${savedOnly ? "Keep what catches your eye." : "A different perspective awaits."}</h3><p>${savedOnly ? "Tap the heart on a work to add it to your collection." : "Choose another artist to explore the collection."}</p><button class="text-link" id="reset-filters">Explore all works ${arrow}</button></div>`;
  document.querySelector("#collection-status").textContent =
    `${visible.length} ${visible.length === 1 ? "artwork" : "artworks"} shown`;
  document.querySelectorAll("[data-filter]").forEach((b) => {
    const active = (b.dataset.filter === "saved") === savedOnly;
    b.classList.toggle("active", active);
    b.setAttribute("aria-pressed", active);
  });
  document.querySelector(".saved-nav").setAttribute("aria-pressed", savedOnly);
  document.querySelector("#saved-count").textContent = saved.size;
}
function toggleSave(id) {
  saved.has(id) ? saved.delete(id) : saved.add(id);
  try {
    localStorage.setItem("roomkey:saved", JSON.stringify([...saved]));
  } catch {
    toast("Saved for this visit. Browser storage is unavailable.");
  }
  const focusId = document.activeElement?.dataset.save;
  renderCollection();
  if (focusId)
    (
      grid.querySelector(`[data-save="${focusId}"]`) ||
      document.querySelector('[data-filter="saved"]')
    ).focus();
  updateSaveDetail();
}
function updateSaveDetail() {
  const button = document.querySelector(".save-detail");
  const isSaved = saved.has(artworks[activeIndex].id);
  button.setAttribute("aria-pressed", isSaved);
  button.classList.toggle("is-saved", isSaved);
  button.querySelector("span").textContent = isSaved
    ? "Saved to your collection"
    : "Save to your collection";
}
function showDetail(id, changeHash = true) {
  activeIndex = Math.max(
    0,
    artworks.findIndex((a) => a.id === id),
  );
  const art = artworks[activeIndex];
  document.querySelector("#detail-image").src = art.image;
  document.querySelector("#detail-image").alt = art.title;
  document.querySelector("#detail-title").textContent = art.title;
  document.querySelector("#detail-artist").textContent =
    art.artist === "Unknown" ? "Artist uncredited" : art.artist;
  document.querySelector("#detail-description").textContent =
    art.description ||
    editorial[art.id] ||
    "An original work from the Roomkey collection.";
  document.querySelector("#detail-year").textContent = art.created;
  document.querySelector("#detail-room").textContent = art.room;
  document.querySelector("#detail-number").textContent =
    `WORK ${String(activeIndex + 1).padStart(2, "0")} / ${String(artworks.length).padStart(2, "0")}`;
  document.querySelector("#detail-pagination").textContent =
    `${activeIndex + 1} / ${artworks.length}`;
  updateSaveDetail();
  if (!detailDialog.open) {
    returnFocus = document.activeElement;
    gallery?.pause();
    detailDialog.showModal();
  }
  document.body.classList.add("dialog-open");
  if (changeHash) history.replaceState(null, "", `#work/${art.id}`);
}
function closeDetail() {
  detailDialog.close();
  if (!galleryDialog.open) document.body.classList.remove("dialog-open");
  else gallery?.resume();
  history.replaceState(null, "", "#collection");
  returnFocus?.focus();
}
function navigateArt(offset) {
  showDetail(
    artworks[(activeIndex + offset + artworks.length) % artworks.length].id,
  );
}
document.addEventListener("click", (e) => {
  const art = e.target.closest("[data-work]");
  if (art) showDetail(art.dataset.work);
  const save = e.target.closest("[data-save]");
  if (save) toggleSave(save.dataset.save);
  const filter = e.target.closest("[data-filter]");
  if (filter) {
    savedOnly = filter.dataset.filter === "saved";
    renderCollection();
  }
  if (e.target.closest("#reset-filters")) {
    savedOnly = false;
    document.querySelector("#artist").value = "all";
    renderCollection();
  }
});
document.querySelector("#artist").addEventListener("change", renderCollection);
document.querySelector(".saved-nav").addEventListener("click", () => {
  savedOnly = !savedOnly;
  document.querySelector("#artist").value = "all";
  renderCollection();
  document.querySelector("#collection").scrollIntoView();
});
document
  .querySelector(".save-detail")
  .addEventListener("click", () => toggleSave(artworks[activeIndex].id));
document.querySelector(".close-detail").addEventListener("click", closeDetail);
document
  .querySelector("#previous-art")
  .addEventListener("click", () => navigateArt(-1));
document
  .querySelector("#next-art")
  .addEventListener("click", () => navigateArt(1));
detailDialog.addEventListener("cancel", (e) => {
  e.preventDefault();
  closeDetail();
});
detailDialog.addEventListener("click", (e) => {
  if (e.target === detailDialog) closeDetail();
});
document.addEventListener("keydown", (e) => {
  if (
    galleryDialog.open &&
    !detailDialog.open &&
    !galleryGuide.open &&
    !e.ctrlKey &&
    !e.metaKey &&
    !e.altKey &&
    !e.target.closest?.("input, select, textarea, [contenteditable]")
  ) {
    if (e.code === "KeyE" && !e.repeat && gallery) {
      e.preventDefault();
      showDetail(roomArtworks[gallery.index].id);
      return;
    }
    if (e.key === "Tab" && !e.shiftKey && e.target.matches("a-scene canvas")) {
      e.preventDefault();
      openGalleryGuide();
      return;
    }
  }
  const modal = galleryGuide.open
    ? galleryGuide
    : detailDialog.open
      ? detailDialog
      : galleryDialog.open
        ? galleryDialog
        : null;
  if (e.key === "Tab" && modal) {
    const focusable = [
      ...modal.querySelectorAll(
        'button:not([disabled]), a[href], select, [tabindex="0"]',
      ),
    ].filter((el) => el.checkVisibility());
    const first = focusable[0];
    const last = focusable.at(-1);
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last?.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first?.focus();
    }
  }
  if (!detailDialog.open || /INPUT|SELECT/.test(e.target.tagName)) return;
  if (e.key === "ArrowRight") navigateArt(1);
  if (e.key === "ArrowLeft") navigateArt(-1);
});
async function openGallery() {
  galleryDialog.showModal();
  document.querySelector("#gallery-title").textContent =
    rooms.length > 1 ? galleryRoom.title : "Between the real & the imagined";
  document.body.classList.add("dialog-open");
  document.querySelector("#gallery-location-name").textContent =
    `${galleryRoom.title} Gallery`;
  if (immersiveOpening) return;
  if (gallery) {
    gallery.resume();
    document.querySelector("a-scene canvas")?.focus({ preventScroll: true });
    return;
  }
  immersiveOpening = true;
  const loading = document.querySelector("#gallery-loading");
  document.querySelector("#gallery-room").disabled = true;
  document.querySelectorAll(".gallery-controls button").forEach((button) => {
    button.disabled = true;
  });
  loading.hidden = false;
  loading.innerHTML =
    '<span class="loading-orbit"></span><h3>A little room for imagination.</h3><p>Preparing your gallery…</p>';
  try {
    if (!roomArtworks.length) {
      loading.innerHTML =
        "<h3>A little space for what comes next.</h3><p>This room is waiting for its first artwork. Choose another room to keep exploring.</p>";
      return;
    }
    const { createGallery } = await import("./gallery.js");
    gallery = await createGallery(
      document.querySelector("#scene-host"),
      roomArtworks,
      {
        roomTitle: galleryRoom.title,
        onSelect(index) {
          document.querySelector("#gallery-work-title").textContent =
            roomArtworks[index].title;
          document.querySelector("#gallery-position").textContent =
            `${index + 1} / ${roomArtworks.length}`;
        },
        onInspect(index) {
          showDetail(roomArtworks[index].id);
        },
        onError() {
          gallery?.destroy();
          gallery = undefined;
          closeGallery();
          toast(
            "The 3D view was interrupted. Reopen the gallery to try again.",
          );
        },
      },
    );
    loading.hidden = true;
    document.querySelectorAll(".gallery-controls button").forEach((button) => {
      button.disabled = false;
    });
    if (!galleryDialog.open) gallery.pause();
    else if (galleryGuide.open) gallery.pause();
    else
      document.querySelector("a-scene canvas")?.focus({ preventScroll: true });
    document.querySelector("#enter-vr").hidden = !gallery.supportsVR;
  } catch (error) {
    console.error("Gallery could not load:", error);
    loading.innerHTML =
      '<h3>A different way to explore.</h3><p>The 3D gallery could not start in this browser. You can still enjoy every work in the collection.</p><button class="button button-light" id="fallback-collection">Explore the collection →</button>';
    document.querySelector("#fallback-collection").onclick = () => {
      closeGallery();
      document.querySelector("#collection").scrollIntoView();
    };
  } finally {
    immersiveOpening = false;
    document.querySelector("#gallery-room").disabled = false;
  }
}
function closeGallery() {
  gallery?.pause();
  galleryDialog.close();
  document.body.classList.remove("dialog-open");
}
document
  .querySelectorAll("[data-enter]")
  .forEach((b) => b.addEventListener("click", openGallery));
document.querySelector("#leave-gallery").onclick = closeGallery;
galleryDialog.addEventListener("cancel", (e) => {
  e.preventDefault();
  openGalleryGuide();
});
document.querySelector("#gallery-prev").onclick = () => gallery?.visit(-1);
document.querySelector("#gallery-next").onclick = () => gallery?.visit(1);
document.querySelector("#gallery-inspect").onclick = () =>
  gallery && showDetail(roomArtworks[gallery.index].id);
document.querySelector("#enter-vr").onclick = () =>
  gallery
    ?.enterVR()
    .catch(() =>
      toast("VR could not start. Check that your headset is connected."),
    );
renderCollection();
function route() {
  if (location.hash.startsWith("#work/")) {
    const id = location.hash.slice(6);
    if (artworks.some((a) => a.id === id)) showDetail(id, false);
  }
}
window.addEventListener("hashchange", route);
route();
if (new URLSearchParams(location.search).has("gallery") && !detailDialog.open)
  openGallery();
