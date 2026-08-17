const STORAGE_KEY = "journey-to-yuritsun-progress";
const KOALA = "🐨";
const OTTER = "🦦";
const PLANE = "✈️";
const CIRCLED_NUMBERS = ["①", "②", "③", "④", "⑤", "⑥", "⑦", "⑧", "⑨", "⑩"];

function parseLocalDate(str) {
  const [y, m, d] = str.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function todayLocal() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

function diffDays(from, to) {
  return Math.round((to - from) / 86400000);
}

function formatDateJP(date) {
  return (date.getMonth() + 1) + "月" + date.getDate() + "日";
}

function formatDateShort(date) {
  return (date.getMonth() + 1) + "." + date.getDate();
}

function loadProgress() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : { completed: [] };
  } catch {
    return { completed: [] };
  }
}

function saveProgress(progress) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
}

function checkAnswer(quiz, given) {
  if (Array.isArray(quiz.choices)) {
    return given === quiz.answer;
  }
  return String(given).trim().toLowerCase() === String(quiz.answer).trim().toLowerCase();
}

function scrollToLesson() {
  document.getElementById("lesson-panel").scrollIntoView({ behavior: "smooth", block: "center" });
}

function scrollToGalleryDay(idx) {
  const el = document.getElementById("gallery-day-" + idx);
  if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
}

// Builds the winding stepping-stone path from today's start (bottom) up to
// the reunion goal (top). The koala marker sits on whichever node currently
// represents "where we are": the next quiz to play, or the last cleared
// node while waiting for tomorrow, or the goal once everything is done.
function renderMap(root, totalDays, completedSet, unlockedCount, currentIndex, start) {
  root.innerHTML = "";

  const allDone = completedSet.size >= totalDays;
  let koalaIndex;
  if (currentIndex !== -1) {
    koalaIndex = currentIndex;
  } else if (allDone) {
    koalaIndex = totalDays;
  } else if (unlockedCount > 0) {
    koalaIndex = unlockedCount - 1;
  } else {
    koalaIndex = -1;
  }

  const dateForIndex = (i) => new Date(start.getTime() + i * 86400000);

  const makeItem = (offset) => {
    const item = document.createElement("div");
    item.className = "map-item";
    item.style.setProperty("--offset", zigzagOffset(offset));
    return item;
  };

  const makeDateLabel = (date) => {
    const label = document.createElement("span");
    label.className = "map-date";
    label.textContent = formatDateShort(date);
    return label;
  };

  for (let i = 0; i < totalDays; i++) {
    const isDone = completedSet.has(i);
    const isLocked = i >= unlockedCount;
    const isKoalaHere = i === koalaIndex;

    const node = document.createElement("button");
    node.type = "button";
    node.id = "map-node-" + i;
    node.className = "map-node" + (isDone ? " done" : "") + (isLocked ? " locked" : "") + (isKoalaHere ? " current" : "");
    node.title = "Day " + (i + 1);

    if (isKoalaHere) {
      node.textContent = KOALA;
    } else if (isDone) {
      node.textContent = "✓";
    } else {
      node.textContent = String(i + 1);
    }

    if (isDone) {
      node.onclick = () => scrollToGalleryDay(i);
    } else if (!isLocked) {
      node.onclick = scrollToLesson;
    } else {
      node.disabled = true;
    }

    const item = makeItem(i);
    if (isKoalaHere && !allDone) {
      const bubble = document.createElement("div");
      bubble.className = "day-bubble";
      bubble.textContent = "DAY " + (i + 1);
      item.appendChild(bubble);
    }
    item.appendChild(node);
    item.appendChild(makeDateLabel(dateForIndex(i)));
    root.appendChild(item);
  }

  const goal = document.createElement("div");
  goal.id = "map-node-" + totalDays;
  goal.className = "map-node goal" + (allDone ? " goal-reached" : "");
  goal.title = "再会の日";
  goal.textContent = allDone && koalaIndex === totalDays ? KOALA + OTTER : PLANE + OTTER;

  const goalItem = makeItem(totalDays);
  const goalTag = document.createElement("div");
  goalTag.className = "goal-tag";
  goalTag.textContent = "GOAL!";
  goalItem.appendChild(goalTag);
  goalItem.appendChild(goal);
  goalItem.appendChild(makeDateLabel(dateForIndex(totalDays)));
  root.appendChild(goalItem);
}

function zigzagOffset(i) {
  return Math.round(Math.sin(i * 0.9) * 70) + "px";
}

function renderGallery(root, progress, totalDays) {
  root.innerHTML = "";
  const completed = [...progress.completed].sort((a, b) => b - a);
  for (const idx of completed) {
    const msg = MESSAGES[idx % MESSAGES.length];
    const card = document.createElement("div");
    card.className = "gallery-card";
    card.id = "gallery-day-" + idx;

    if (PHOTOS.length > 0) {
      const img = document.createElement("img");
      img.src = "photos/" + PHOTOS[idx % PHOTOS.length];
      img.alt = "day " + (idx + 1);
      img.onerror = () => {
        img.replaceWith(makePlaceholder());
      };
      card.appendChild(img);
    } else {
      card.appendChild(makePlaceholder());
    }

    const label = document.createElement("div");
    label.className = "gallery-day";
    label.textContent = "Day " + (idx + 1);
    const text = document.createElement("p");
    text.className = "gallery-message";
    text.textContent = msg;

    card.appendChild(label);
    card.appendChild(text);
    root.appendChild(card);
  }
}

function makePlaceholder() {
  const div = document.createElement("div");
  div.className = "photo-placeholder";
  div.textContent = "💛";
  return div;
}

function main() {
  const start = parseLocalDate(START_DATE);
  const reunion = parseLocalDate(REUNION_DATE);
  const today = todayLocal();
  const totalDays = Math.max(1, diffDays(start, reunion));

  document.getElementById("title").textContent = GAME_TITLE;
  document.getElementById("date-range").textContent =
    formatDateShort(start) + "  →  " + formatDateShort(reunion);

  const daysUntilReunion = diffDays(today, reunion);

  const reunionLabel = typeof REUNION_LABEL !== "undefined" ? REUNION_LABEL : "再会まで♡";
  document.getElementById("status-countdown-num").textContent = daysUntilReunion > 0 ? daysUntilReunion : 0;
  document.getElementById("status-countdown-label").textContent = reunionLabel;

  const flightFrom = typeof FLIGHT_FROM !== "undefined" ? FLIGHT_FROM : "🇯🇵";
  const flightTo = typeof FLIGHT_TO !== "undefined" ? FLIGHT_TO : "🇬🇧";
  const flightBadge = document.getElementById("flight-badge");
  if (flightFrom || flightTo) {
    flightBadge.textContent = [flightFrom, PLANE, flightTo].filter(Boolean).join(" ");
  } else {
    flightBadge.hidden = true;
  }

  const progress = loadProgress();
  const completedSet = new Set(progress.completed);

  const unlockedCount = Math.min(totalDays, Math.max(0, diffDays(start, today) + 1));

  const quizSection = document.getElementById("quiz-section");
  const doneSection = document.getElementById("done-section");
  const reunionSection = document.getElementById("reunion-section");
  const notStartedSection = document.getElementById("not-started-section");
  const missionBox = document.getElementById("mission-box");
  const missionTitle = document.getElementById("mission-title");
  const missionText = document.getElementById("mission-text");
  const missionBtn = document.getElementById("mission-btn");

  quizSection.hidden = true;
  doneSection.hidden = true;
  reunionSection.hidden = true;
  notStartedSection.hidden = true;
  missionBox.hidden = false;
  missionBtn.hidden = true;

  let currentIndex = -1;
  for (let i = 0; i < unlockedCount; i++) {
    if (!completedSet.has(i)) {
      currentIndex = i;
      break;
    }
  }

  renderMap(document.getElementById("map"), totalDays, completedSet, unlockedCount, currentIndex, start);
  renderGallery(document.getElementById("gallery"), progress, totalDays);
  requestAnimationFrame(() => {
    const marker = document.querySelector(".map-node.current");
    if (marker) marker.scrollIntoView({ block: "center" });
  });

  const displayDay = currentIndex !== -1
    ? currentIndex + 1
    : Math.max(1, Math.min(unlockedCount, totalDays));
  document.getElementById("status-day-current").textContent = displayDay;
  document.getElementById("status-day-total").textContent = totalDays;
  document.getElementById("progress-fill").style.width =
    Math.round((completedSet.size / totalDays) * 100) + "%";

  if (daysUntilReunion <= 0 && completedSet.size >= totalDays) {
    reunionSection.hidden = false;
    missionBox.hidden = true;
    document.getElementById("reunion-title").textContent = REUNION_TITLE;
    document.getElementById("reunion-message").textContent = REUNION_MESSAGE;
    return;
  }

  if (unlockedCount === 0) {
    notStartedSection.hidden = false;
    const startMsg = formatDateJP(start) + " からスタートするよ。楽しみに待っててね 🐨";
    document.getElementById("not-started-message").textContent = startMsg;
    missionTitle.textContent = "はじまるまで";
    missionText.textContent = startMsg;
    return;
  }

  if (currentIndex === -1) {
    doneSection.hidden = false;
    missionTitle.textContent = "おつかれさま！";
    missionText.textContent = "今日の分はクリア済み。また明日ね 💌";
    return;
  }

  quizSection.hidden = false;
  missionTitle.textContent = "今日のミッション";
  missionText.textContent = "クイズを解いて1マス進もう！";
  missionBtn.hidden = false;
  missionBtn.onclick = scrollToLesson;

  const quiz = QUIZZES[currentIndex % QUIZZES.length];

  document.getElementById("day-label").textContent = "Day " + (currentIndex + 1) + " / " + totalDays;
  document.getElementById("question").textContent = quiz.question;

  const answerArea = document.getElementById("answer-area");
  const feedback = document.getElementById("feedback");
  answerArea.innerHTML = "";
  feedback.textContent = "";

  const revealDay = (idx) => {
    document.getElementById("reveal-message").textContent = MESSAGES[idx % MESSAGES.length];
    const photoBox = document.getElementById("reveal-photo");
    photoBox.innerHTML = "";
    if (PHOTOS.length > 0) {
      const img = document.createElement("img");
      img.src = "photos/" + PHOTOS[idx % PHOTOS.length];
      img.alt = "day " + (idx + 1);
      img.onerror = () => img.replaceWith(makePlaceholder());
      photoBox.appendChild(img);
    } else {
      photoBox.appendChild(makePlaceholder());
    }
    document.getElementById("reveal").hidden = false;
    answerArea.hidden = true;
  };

  const onCorrect = () => {
    completedSet.add(currentIndex);
    progress.completed = [...completedSet];
    saveProgress(progress);
    feedback.textContent = "正解！🎉 1マス進んだよ！";
    feedback.className = "feedback correct";
    revealDay(currentIndex);

    let nextIndex = -1;
    for (let i = 0; i < unlockedCount; i++) {
      if (!completedSet.has(i)) {
        nextIndex = i;
        break;
      }
    }
    renderMap(document.getElementById("map"), totalDays, completedSet, unlockedCount, nextIndex, start);
    renderGallery(document.getElementById("gallery"), progress, totalDays);
    document.getElementById("progress-fill").style.width =
      Math.round((completedSet.size / totalDays) * 100) + "%";
    const newDisplayDay = nextIndex !== -1
      ? nextIndex + 1
      : Math.max(1, Math.min(unlockedCount, totalDays));
    document.getElementById("status-day-current").textContent = newDisplayDay;
  };

  const onWrong = () => {
    feedback.textContent = "おしい、もう一度考えてみて！";
    feedback.className = "feedback wrong";
  };

  if (Array.isArray(quiz.choices)) {
    quiz.choices.forEach((choice, i) => {
      const btn = document.createElement("button");
      btn.className = "choice-btn";

      const badge = document.createElement("span");
      badge.className = "choice-badge";
      badge.textContent = CIRCLED_NUMBERS[i] || String(i + 1);

      const label = document.createElement("span");
      label.className = "choice-label";
      label.textContent = choice;

      btn.appendChild(badge);
      btn.appendChild(label);
      btn.onclick = () => {
        if (checkAnswer(quiz, i)) onCorrect();
        else onWrong();
      };
      answerArea.appendChild(btn);
    });
  } else {
    const form = document.createElement("form");
    form.className = "text-answer-form";
    const input = document.createElement("input");
    input.type = "text";
    input.placeholder = "答えを入力";
    const submit = document.createElement("button");
    submit.type = "submit";
    submit.textContent = "こたえる";
    form.appendChild(input);
    form.appendChild(submit);
    form.onsubmit = (e) => {
      e.preventDefault();
      if (checkAnswer(quiz, input.value)) onCorrect();
      else onWrong();
    };
    answerArea.appendChild(form);
  }
}

document.addEventListener("DOMContentLoaded", main);
