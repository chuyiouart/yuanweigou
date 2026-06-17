const header = document.querySelector(".site-header");

window.addEventListener("scroll", () => {
  header.style.boxShadow =
    window.scrollY > 18 ? "0 12px 30px rgba(28, 24, 18, 0.08)" : "none";
});

const navGroups = [...document.querySelectorAll(".nav-group")];

function closeOtherNavGroups(activeGroup) {
  navGroups.forEach((group) => {
    if (group !== activeGroup) group.removeAttribute("open");
  });
}

navGroups.forEach((group) => {
  const summary = group.querySelector("summary");

  summary?.addEventListener("click", (event) => {
    event.preventDefault();
    closeOtherNavGroups(group);
    group.setAttribute("open", "");
  });

  group.addEventListener("toggle", () => {
    if (group.open) closeOtherNavGroups(group);
  });

  group.addEventListener("mouseenter", () => {
    closeOtherNavGroups(group);
    group.setAttribute("open", "");
  });
});

document.addEventListener("pointerdown", (event) => {
  if (!event.target.closest(".nav-group")) closeOtherNavGroups(null);
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") closeOtherNavGroups(null);
});
