const STORAGE_KEY = "journey-to-yuritsun-progress";

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

function renderPath(root, totalDays, completedCount) {
  root.innerHTML = "";
  for (let i = 0; i < totalDays; i++) {
    const step = document.createElement("div");
    step.className = "step" + (i < completedCount ? " step-done" : "");
    step.textContent = i < completedCount ? "❤" : "";
    root.appendChild(step);
  }
}

function renderGallery(root, progress, totalDays) {
  root.innerHTML = "";
  const completed = [...progress.completed].sort((a, b) => b - a);
  for (const idx of completed) {
    const msg = MESSAGES[idx % MESSAGES.length];
    const card = document.createElement("div");
    card.className = "gallery-card";

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

  const daysUntilReunion = diffDays(today, reunion);
  document.getElementById("countdown").textContent =
    daysUntilReunion > 0 ? daysUntilReunion + " 日" : "0 日";

  const progress = loadProgress();
  const completedSet = new Set(progress.completed);

  const unlockedCount = Math.min(totalDays, Math.max(0, diffDays(start, today) + 1));

  renderPath(document.getElementById("path"), totalDays, completedSet.size);
  renderGallery(document.getElementById("gallery"), progress, totalDays);

  const quizSection = document.getElementById("quiz-section");
  const doneSection = document.getElementById("done-section");
  const reunionSection = document.getElementById("reunion-section");

  quizSection.hidden = true;
  doneSection.hidden = true;
  reunionSection.hidden = true;

  if (daysUntilReunion <= 0 && completedSet.size >= totalDays) {
    reunionSection.hidden = false;
    document.getElementById("reunion-title").textContent = REUNION_TITLE;
    document.getElementById("reunion-message").textContent = REUNION_MESSAGE;
    return;
  }

  let currentIndex = -1;
  for (let i = 0; i < unlockedCount; i++) {
    if (!completedSet.has(i)) {
      currentIndex = i;
      break;
    }
  }

  if (currentIndex === -1) {
    doneSection.hidden = false;
    return;
  }

  quizSection.hidden = false;
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
    feedback.textContent = "正解！🎉";
    feedback.className = "feedback correct";
    revealDay(currentIndex);
    renderPath(document.getElementById("path"), totalDays, completedSet.size);
    renderGallery(document.getElementById("gallery"), progress, totalDays);
  };

  const onWrong = () => {
    feedback.textContent = "おしい、もう一度考えてみて！";
    feedback.className = "feedback wrong";
  };

  if (Array.isArray(quiz.choices)) {
    quiz.choices.forEach((choice, i) => {
      const btn = document.createElement("button");
      btn.className = "choice-btn";
      btn.textContent = choice;
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
