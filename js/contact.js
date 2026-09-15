document.addEventListener("DOMContentLoaded", function () {
  var form = document.getElementById("inquiry-form");
  if (!form) return;

  var SMS_TO = "+821062696193";
  var MAIL_TO = "wooyeol99@gmail.com";

  // iOS는 sms: 본문 구분자로 &를, 그 외는 ?를 쓴다
  var isIOS = /iP(hone|ad|od)/.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);

  var clicked = null;
  form.addEventListener("click", function (event) {
    var btn = event.target.closest("button[data-send]");
    if (btn) clicked = btn.getAttribute("data-send");
  });

  function field(data, key) {
    return (data.get(key) || "").trim();
  }

  form.addEventListener("submit", function (event) {
    event.preventDefault();

    var data = new FormData(form);
    var name = field(data, "name") || "고객";
    var size = field(data, "size");

    var rows = [
      ["성함", field(data, "name")],
      ["연락처", field(data, "phone")],
      ["시공 지역", field(data, "region")],
      ["평형/면적", size],
      ["희망 자재", field(data, "material")],
      ["희망 일정", field(data, "schedule")],
      ["추가 내용", field(data, "message")]
    ].filter(function (row) { return row[1]; });

    var body = "[온앤온마루 견적 문의]\n" +
      rows.map(function (row) { return row[0] + ": " + row[1]; }).join("\n");

    var mode = clicked || (event.submitter && event.submitter.getAttribute("data-send")) || "sms";
    var href;

    if (mode === "sms") {
      href = "sms:" + SMS_TO + (isIOS ? "&" : "?") + "body=" + encodeURIComponent(body);
    } else {
      href = "mailto:" + MAIL_TO +
        "?subject=" + encodeURIComponent("[견적 문의] " + name + (size ? " / " + size : "")) +
        "&body=" + encodeURIComponent(body);
    }

    clicked = null;

    // 일부 모바일 브라우저는 location 대입으로 sms:/mailto:를 열지 못한다
    var link = document.createElement("a");
    link.href = href;
    link.rel = "noopener";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  });
});
