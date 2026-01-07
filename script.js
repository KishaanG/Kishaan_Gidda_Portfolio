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

// open on click
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

// close when clicking the dim area (anywhere outside the video box)
modal.addEventListener("click", (e) => {
  // if you clicked the backdrop (not the video/content), close
  if (!e.target.closest(".video-modal__content")) closeModal();
});

function closeModal() {
  modal.classList.remove("open");
  modal.setAttribute("aria-hidden", "true");
  document.body.style.overflow = "";

  modalVideo.pause();
  modalVideo.removeAttribute("src"); // stops download/playback
  modalVideo.load();
}

// optional: ESC to close
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && modal.classList.contains("open")) closeModal();
});
