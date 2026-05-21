const header = document.querySelector(".site-header");

window.addEventListener("scroll", () => {
  header.style.boxShadow =
    window.scrollY > 18 ? "0 12px 30px rgba(28, 24, 18, 0.08)" : "none";
});
