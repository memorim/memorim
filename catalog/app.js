const buttons = [...document.querySelectorAll("[data-filter]")];
const cards = [...document.querySelectorAll(".project")];
let activeCategory;
function filterProjects() {
  const requested = new URLSearchParams(location.search).get("category") || "all";
  const category = buttons.some(button => button.dataset.filter === requested) ? requested : "all";
  buttons.forEach(button => button.setAttribute("aria-pressed", String(button.dataset.filter === category)));
  cards.forEach(card => { card.hidden = category !== "all" && !card.dataset.category.split(" ").includes(category); });
  document.querySelector(".result").textContent = `${cards.filter(card => !card.hidden).length} projects`;
  const changed = activeCategory !== undefined && activeCategory !== category;
  activeCategory = category;
  if (changed) document.dispatchEvent?.(new Event('projectsfiltered'));
}
buttons.forEach(button => button.addEventListener("click", () => {
  const url = new URL(location.href);
  if (button.dataset.filter === "all") url.searchParams.delete("category");
  else url.searchParams.set("category", button.dataset.filter);
  history.pushState(null, "", url);
  filterProjects();
}));
window.addEventListener("popstate", filterProjects);
filterProjects();
