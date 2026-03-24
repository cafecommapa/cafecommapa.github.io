document.addEventListener("DOMContentLoaded", function () {
  const page = document.body.dataset.page || "";

  window.SiteFooter?.init?.();
  window.SiteVisitas?.init?.();
  window.SiteRelogios?.init?.();
  window.SiteMenu?.init?.();
  window.SitePopups?.init?.({ page });

  if (page === "home") window.SiteHome?.init?.();
  if (page === "mapa") window.SiteMapa?.init?.();
  if (page === "post") window.SitePostPage?.init?.();
});
