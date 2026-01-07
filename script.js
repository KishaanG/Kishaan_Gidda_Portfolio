document.getElementById("year").textContent = new Date().getFullYear();

const copyBtn = document.getElementById("copyEmail");
copyBtn?.addEventListener("click", async () => {
  const email = "kishaangidda@gmail.com";
  try {
    await navigator.clipboard.writeText(email);
    copyBtn.textContent = "Copied!";
    setTimeout(() => (copyBtn.textContent = "Copy email"), 1200);
  } catch {
    alert(email);
  }
});

const modal = document.getElementById("videoModal");
const modalVideo = document.getElementById("modalVideo");

document.querySelectorAll(".video-thumb").forEach(v => {
  v.addEventListener("click", () => {
    const src = v.querySelector("source")?.getAttribute("src") || v.currentSrc;

    modal.classList.add("open");
    modal.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";

    modalVideo.src = src;
    modalVideo.currentTime = 0;
    modalVideo.play().catch(() => {});
  });
});

modal.addEventListener("click", (e) => {
  if (!e.target.closest(".video-modal__content")) closeModal();
});

function closeModal() {
  modal.classList.remove("open");
  modal.setAttribute("aria-hidden", "true");
  document.body.style.overflow = "";

  modalVideo.pause();
  modalVideo.removeAttribute("src");
  modalVideo.load();
}

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && modal.classList.contains("open")) closeModal();
});

const header = document.querySelector(".header");

let lastY = window.scrollY;
const shrinkAt = 60;
const minDelta = 10;

window.addEventListener("scroll", () => {
  const y = window.scrollY;
  const delta = y - lastY;

  if (Math.abs(delta) < minDelta) return;

  const down = delta > 0;

  header.classList.toggle("shrunk", y > shrinkAt);

  if (down && y > shrinkAt) header.classList.add("hidden");
  else header.classList.remove("hidden");

  lastY = y;
});
