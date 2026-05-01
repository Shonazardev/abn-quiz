const loadingScreen = document.querySelector("#loading-screen");
const quizScreen = document.querySelector("#quiz-screen");
const resultScreen = document.querySelector("#result-screen");
const currentQuestionNode = document.querySelector("#current-question");
const totalQuestionsNode = document.querySelector("#total-questions");
const timerNode = document.querySelector("#timer");
const questionTextNode = document.querySelector("#question-text");
const optionsContainer = document.querySelector("#options-container");
const explanationNode = document.querySelector("#explanation");
const pauseButton = document.querySelector("#pause-button");
const pausePanel = document.querySelector("#pause-panel");
const finishButton = document.querySelector("#finish-button");
const restartButton = document.querySelector("#restart-button");
const historyCountNode = document.querySelector("#history-count");
const historyListNode = document.querySelector("#history-list");
const resultHistoryCountNode = document.querySelector("#result-history-count");
const resultHistoryListNode = document.querySelector("#result-history-list");
const answeredCountNode = document.querySelector("#answered-count");
const correctCountNode = document.querySelector("#correct-count");
const scoreCountNode = document.querySelector("#score-count");
const percentNode = document.querySelector("#percent-count");
const spentTimeNode = document.querySelector("#spent-time");

let quizQuestions = [];
let currentIndex = 0;
let correctCount = 0;
let answeredCount = 0;
let timeLeft = 30;
let timerInterval = null;
let nextQuestionTimeout = null;
let isAnswered = false;
let isPaused = false;
let startedAt = 0;
let pauseStartedAt = 0;
let totalPausedMs = 0;
let answerHistory = [];

const shuffle = (items) => {
  const result = [...items];

  for (let i = result.length - 1; i > 0; i -= 1) {
    const randomIndex = Math.floor(Math.random() * (i + 1));
    [result[i], result[randomIndex]] = [result[randomIndex], result[i]];
  }

  return result;
};

const showOnly = (screen) => {
  [loadingScreen, quizScreen, resultScreen].forEach((node) => {
    node?.classList.add("hidden");
  });

  screen?.classList.remove("hidden");
};

const formatTime = (secondsTotal) => {
  const minutes = Math.floor(secondsTotal / 60);
  const seconds = secondsTotal % 60;
  return `${minutes} daqiqa ${seconds} soniya`;
};

const escapeHtml = (value) =>
  String(value).replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  }[char]));

const startTimer = () => {
  clearInterval(timerInterval);
  timeLeft = 30;
  timerNode.textContent = timeLeft;
  timerNode.classList.remove("danger");

  timerInterval = setInterval(() => {
    timeLeft -= 1;
    timerNode.textContent = timeLeft;

    if (timeLeft <= 5) {
      timerNode.classList.add("danger");
    }

    if (timeLeft <= 0) {
      handleTimeout();
    }
  }, 1000);
};

const renderHistory = (targetNode = historyListNode, countNode = historyCountNode) => {
  countNode.textContent = `${answerHistory.length} ta`;

  if (!answerHistory.length) {
    targetNode.innerHTML = '<p class="empty-history">Hali javob berilmadi.</p>';
    return;
  }

  targetNode.innerHTML = answerHistory
    .map((item, index) => {
      const statusText = item.isCorrect ? "To'g'ri" : "Noto'g'ri";
      const selected = item.selected || "Vaqt tugadi";

      return `
        <article class="history-item ${item.isCorrect ? "is-correct" : "is-wrong"}">
          <div class="history-item-head">
            <strong>${index + 1}. ${statusText}</strong>
            <span>Savol ${item.number}</span>
          </div>
          <p>${escapeHtml(item.text)}</p>
          <small>Siz: ${escapeHtml(selected)}</small>
          <small>To'g'ri: ${escapeHtml(item.answer)}</small>
        </article>
      `;
    })
    .join("");
};

const setPaused = (nextPaused) => {
  if (isAnswered || isPaused === nextPaused) {
    return;
  }

  isPaused = nextPaused;
  quizScreen.classList.toggle("is-paused", isPaused);
  pausePanel.classList.toggle("hidden", !isPaused);
  pauseButton.textContent = isPaused ? "Davom etish" : "Pauza";
  finishButton.disabled = isPaused;

  optionsContainer.querySelectorAll(".option").forEach((option) => {
    option.disabled = isPaused;
  });

  if (isPaused) {
    pauseStartedAt = Date.now();
    clearInterval(timerInterval);
  } else {
    totalPausedMs += Date.now() - pauseStartedAt;
    startTimerFromCurrent();
  }
};

const startTimerFromCurrent = () => {
  clearInterval(timerInterval);
  timerNode.textContent = timeLeft;

  timerInterval = setInterval(() => {
    timeLeft -= 1;
    timerNode.textContent = timeLeft;

    if (timeLeft <= 5) {
      timerNode.classList.add("danger");
    }

    if (timeLeft <= 0) {
      handleTimeout();
    }
  }, 1000);
};

const addHistoryItem = (question, selected) => {
  const isCorrect = selected === question.answer;

  answerHistory.push({
    number: question.number,
    text: question.text,
    selected,
    answer: question.answer,
    isCorrect,
  });

  renderHistory();
};

const loadQuestion = () => {
  const question = quizQuestions[currentIndex];
  isAnswered = false;
  isPaused = false;
  pauseStartedAt = 0;
  quizScreen.classList.remove("is-paused");
  pausePanel.classList.add("hidden");
  pauseButton.textContent = "Pauza";
  pauseButton.disabled = false;
  finishButton.disabled = false;

  currentQuestionNode.textContent = currentIndex + 1;
  totalQuestionsNode.textContent = quizQuestions.length;
  questionTextNode.textContent = question.text;
  optionsContainer.innerHTML = "";
  explanationNode.textContent = "";
  explanationNode.classList.add("hidden");

  question.options.forEach((optionText, index) => {
    const optionButton = document.createElement("button");
    optionButton.className = "option";
    optionButton.type = "button";
    optionButton.dataset.value = optionText;
    optionButton.innerHTML = `<strong>${String.fromCharCode(65 + index)}.</strong><span>${optionText}</span>`;
    optionButton.addEventListener("click", () => selectOption(optionButton, question));
    optionsContainer.append(optionButton);
  });

  startTimer();
};

const lockOptions = (question) => {
  optionsContainer.querySelectorAll(".option").forEach((option) => {
    option.classList.add("disabled");
    option.disabled = true;

    if (option.dataset.value === question.answer) {
      option.classList.add("correct");
    }
  });
};

const showExplanation = (question) => {
  if (!question.explanation) {
    return;
  }

  explanationNode.textContent = question.explanation;
  explanationNode.classList.remove("hidden");
};

function selectOption(selectedOption, question) {
  if (isAnswered || isPaused) {
    return;
  }

  isAnswered = true;
  answeredCount += 1;
  pauseButton.disabled = true;
  clearInterval(timerInterval);
  lockOptions(question);
  showExplanation(question);
  addHistoryItem(question, selectedOption.dataset.value);

  if (selectedOption.dataset.value === question.answer) {
    correctCount += 1;
  } else {
    selectedOption.classList.add("wrong");
  }

  nextQuestionTimeout = setTimeout(goNext, 2200);
}

function handleTimeout() {
  if (isAnswered || isPaused) {
    return;
  }

  isAnswered = true;
  pauseButton.disabled = true;
  clearInterval(timerInterval);
  lockOptions(quizQuestions[currentIndex]);
  showExplanation(quizQuestions[currentIndex]);
  addHistoryItem(quizQuestions[currentIndex], "");
  nextQuestionTimeout = setTimeout(goNext, 2200);
}

function goNext() {
  currentIndex += 1;

  if (currentIndex >= quizQuestions.length) {
    showResult();
    return;
  }

  quizScreen.style.animation = "none";
  quizScreen.offsetHeight;
  quizScreen.style.animation = "";
  loadQuestion();
}

function showResult() {
  clearInterval(timerInterval);
  clearTimeout(nextQuestionTimeout);

  if (isPaused) {
    totalPausedMs += Date.now() - pauseStartedAt;
    isPaused = false;
  }

  const spentSeconds = Math.floor((Date.now() - startedAt - totalPausedMs) / 1000);
  const percent = quizQuestions.length
    ? Math.round((correctCount / quizQuestions.length) * 100)
    : 0;

  answeredCountNode.textContent = answeredCount;
  correctCountNode.textContent = correctCount;
  scoreCountNode.textContent = correctCount;
  percentNode.textContent = `${percent}%`;
  spentTimeNode.textContent = formatTime(spentSeconds);
  renderHistory(resultHistoryListNode, resultHistoryCountNode);

  showOnly(resultScreen);
}

function startQuiz() {
  quizQuestions = shuffle(questions).map((question) => ({
    ...question,
    options: shuffle(question.options),
  }));
  currentIndex = 0;
  correctCount = 0;
  answeredCount = 0;
  isPaused = false;
  totalPausedMs = 0;
  pauseStartedAt = 0;
  answerHistory = [];
  startedAt = Date.now();
  renderHistory();
  showOnly(quizScreen);
  loadQuestion();
}

pauseButton.addEventListener("click", () => {
  setPaused(!isPaused);
});

finishButton.addEventListener("click", () => {
  if (window.confirm("Testni hozir tugatmoqchimisiz?")) {
    showResult();
  }
});

restartButton.addEventListener("click", () => {
  startQuiz();
});

window.addEventListener("load", () => {
  totalQuestionsNode.textContent = questions.length;
  setTimeout(startQuiz, 350);
});
