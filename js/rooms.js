document.addEventListener("DOMContentLoaded", function () {
  var preview = document.getElementById("room-preview");
  if (!preview) return;

  var picker = preview.querySelector(".combo-picker");
  var label = document.getElementById("combo-label");
  if (!picker) return;

  picker.addEventListener("click", function (event) {
    var btn = event.target.closest("button[data-wall]");
    if (!btn) return;

    preview.style.setProperty("--wall", btn.dataset.wall);
    preview.style.setProperty("--floor", btn.dataset.floor);
    preview.style.setProperty("--door", btn.dataset.door);

    picker.querySelectorAll("button").forEach(function (b) {
      b.classList.toggle("is-active", b === btn);
    });

    if (label) label.textContent = btn.dataset.label;
  });
});
