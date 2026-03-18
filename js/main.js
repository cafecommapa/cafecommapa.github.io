document.addEventListener("DOMContentLoaded", function () {
  const page = document.body.dataset.page || "";

  window.SiteRelogios?.init?.();
  window.SiteMenu?.init?.();
  window.SitePopups?.init?.({ page });

  if (page === "home") window.SiteHome?.init?.();
  if (page === "mapa") window.SiteMapa?.init?.();
  if (page === "post") window.SitePostPage?.init?.();
});
