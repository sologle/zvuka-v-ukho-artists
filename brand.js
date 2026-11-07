if (document.documentElement.classList.contains("brand-hitach")) {
  document.title = "ХИТАЧ — Список артистов";
  document.querySelector('meta[name="theme-color"]').content = "#11140d";
  const logo = document.querySelector(".logo");
  logo.src = "hitach-logo.jpg";
  logo.alt = "ХИТАЧ";
  document.querySelector(".brand h1").textContent = "ХИТАЧ";
  document.querySelector(".brandline").textContent = "ХИТАЧ";
}
