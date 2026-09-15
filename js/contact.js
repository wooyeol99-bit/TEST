document.addEventListener("DOMContentLoaded", function () {
  var form = document.getElementById("inquiry-form");
  if (!form) return;

  var RECIPIENT = "contact@onnonmaru.co.kr";

  form.addEventListener("submit", function (event) {
    event.preventDefault();

    var data = new FormData(form);
    var lines = [
      "성함: " + (data.get("name") || ""),
      "연락처: " + (data.get("phone") || ""),
      "시공 지역: " + (data.get("region") || ""),
      "평형/면적: " + (data.get("size") || ""),
      "희망 자재: " + (data.get("material") || ""),
      "희망 일정: " + (data.get("schedule") || ""),
      "",
      "추가 내용:",
      data.get("message") || ""
    ];

    var subject = "[견적 문의] " + (data.get("name") || "고객") + " / " + (data.get("size") || "");
    var href =
      "mailto:" + RECIPIENT +
      "?subject=" + encodeURIComponent(subject) +
      "&body=" + encodeURIComponent(lines.join("\n"));

    window.location.href = href;
  });
});
