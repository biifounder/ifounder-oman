

// -------------------------
// SHARED TEMPLATE LOADER
// -------------------------
// Call this once from each lesson page, e.g. loadLessonTemplate(() => loadLesson(1))
function loadLessonTemplate(callback) {
    fetch("/shared/lesson-template.html")
        .then(r => r.text())
        .then(html => {
            document.body.innerHTML = html;

            // ⭐ Make Back button return to previous page
            const backBtn = document.getElementById("backBtn");
            if (backBtn) {
                backBtn.onclick = () => history.back();
            }

            callback();
        });
}


// Call this once from each subject page, e.g. loadSubjectTemplate(() => loadSubject(1))
function loadSubjectTemplate(callback) {
    fetch("/shared/subject-template.html")
        .then(r => r.text())
        .then(html => {
            document.body.innerHTML = html;

            // ⭐ Add this
            const backBtn = document.getElementById("backToYear");
            if (backBtn) {
                backBtn.onclick = () => history.back();
            }

            callback();
        });
}



function renderSubjectPage(subjectName, units, basePath) {
    document.getElementById("subjectTitle").textContent = subjectName;

    const container = document.getElementById("units-container");
    container.innerHTML = ""; // clear old content if needed

    units.forEach(unit => {
        const h2 = document.createElement("h2");
        h2.className = "unit-heading";
        h2.textContent = unit.name;
        container.appendChild(h2);

        unit.lessons.forEach(lesson => {
            const btn = document.createElement("button");
            btn.className = "menu-btn";
            btn.textContent = lesson.title;
            btn.onclick = () => {
                location.href = `${basePath}lesson${lesson.id}.html?subject=${encodeURIComponent(basePath + "content.json")}`;
            };
            
            container.appendChild(btn);
        });
    });    
}



// Call this once from the year page, e.g. loadYearTemplate(() => loadYear(1))
function loadYearTemplate(callback) {
    fetch("/shared/year-template.html")
        .then(r => r.text())
        .then(html => {
            document.body.innerHTML = html;
            callback();
        });
}



function renderYearPage(yearName, subjects) {
    // 1. Set the year title
    document.getElementById("yearTitle").textContent = yearName;

    // 2. Setup back button
    setupYearBackButton();

    // 3. Render subject buttons
    const container = document.getElementById("subjects-container");
    container.innerHTML = "";

    subjects.forEach(sub => {
        const btn = document.createElement("button");
        btn.className = "menu-btn";
        btn.textContent = sub.name;
        btn.onclick = () => location.href = sub.path;
        container.appendChild(btn);
    });
}




function setupSubjectBackButton(year) {
    const btn = document.getElementById("backToYear");
    btn.onclick = () => {
        location.href = `${year}/year.html`;
    };
}

// Call this once from the year page, e.g. setupYearBackButton()
function setupYearBackButton() {
    const btn = document.getElementById("backToHome");
    btn.onclick = () => {
        location.href = "/index.html";
    };
}


// -------------------------
// CONFIG
// -------------------------
// Call this from each lesson page, e.g. loadLesson(1)
function loadLesson(lessonId) {
    window.CURRENT_LESSON_ID = lessonId;
    loadLessonData(lessonId);
}

// -------------------------
// STATE
// -------------------------
let groups = [];
let queues = [];
let currentIndex = [];

// -------------------------
// LOCAL STORAGE
// -------------------------
function storageKey() {
    return "practiceState_lesson" + window.CURRENT_LESSON_ID;
}

function saveState() {
    const state = groups.map(g => ({
        mark: g.mark,
        flag: g.flag
    }));
    localStorage.setItem(storageKey(), JSON.stringify(state));
}

function loadState() {
    const saved = localStorage.getItem(storageKey());
    if (!saved) return;

    let parsed;
    try {
        parsed = JSON.parse(saved);
    } catch {
        return;
    }

    parsed.forEach((g, i) => {
        if (!groups[i]) return;
        if (typeof g.mark === "number") groups[i].mark = g.mark;
        if (typeof g.flag === "number") groups[i].flag = g.flag;
    });
}

// -------------------------
// ORDERING LOGIC
// -------------------------
function getGroupPriority(g) {
    const wrong = g.mark === -1;
    const correct = g.mark === 1;
    const unseen = g.mark === 0;
    const flagged = g.flag === 1;

    if (wrong && flagged) return 1;
    if (wrong && !flagged) return 2;
    if (flagged && unseen) return 3;
    if (flagged && correct) return 4;
    if (unseen && !flagged) return 5;
    if (correct && !flagged) return 6;

    return 999;
}

// -------------------------
// UTILS
// -------------------------
function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
}

// -------------------------
// FILTER LOGIC
// -------------------------
function groupMatchesFilter(group) {
    const filterEl = document.getElementById("filter");
    const filter = filterEl ? filterEl.value : "all";

    if (filter === "flagged") return group.flag === 1;
    if (filter === "wrong") return group.mark === -1;
    if (filter === "unsolved") return group.mark === 0;

    return true;
}

function buildQueueForGroup(group) {
    const indices = group.questions.map((_, i) => i);
    shuffle(indices);
    return indices;
}

function rebuildQueues() {
    groups.sort((a, b) => getGroupPriority(a) - getGroupPriority(b));

    queues = groups.map(group =>
        groupMatchesFilter(group) ? buildQueueForGroup(group) : []
    );

    currentIndex = queues.map(q => q.length ? q.shift() : null);
}

function nextQuestionIndex(groupIndex) {
    if (queues[groupIndex].length === 0)
        queues[groupIndex] = buildQueueForGroup(groups[groupIndex]);

    return queues[groupIndex].shift();
}

// -------------------------
// RENDER
// -------------------------
function loadQuestions() {
    const container = document.getElementById("questions-container");
    if (!container) return;

    container.innerHTML = "";

    groups.forEach((group, groupIndex) => {

        if (!groupMatchesFilter(group)) return;

        const qIndex = currentIndex[groupIndex];
        if (qIndex === null || qIndex === undefined) return;

        const qObj = group.questions[qIndex];

        const box = document.createElement("div");
        box.className = "question-box";

        const flagClass = group.flag === 1 ? "" : "flag-off";

        const markSymbol =
            group.mark === 1 ? "✔" :
            group.mark === -1 ? "✖" :
            "○";

        const markColor =
            group.mark === 1 ? "green" :
            group.mark === -1 ? "red" :
            "grey";

        box.innerHTML = `
            <span class="mark-indicator" style="color:${markColor}">${markSymbol}</span>
            <button class="flag-btn ${flagClass}">${group.flag ? "★" : "☆"}</button>
            <p>${qObj.q}</p>
            <div class="choices"></div>
            <div class="hint" style="display:none;"></div>
            <button class="try-btn">Try another question</button>
        `;

        const flagBtn = box.querySelector(".flag-btn");
        const markSpan = box.querySelector(".mark-indicator");

        flagBtn.onclick = () => {
            group.flag = group.flag ? 0 : 1;
            flagBtn.textContent = group.flag ? "★" : "☆";
            flagBtn.classList.toggle("flag-off");
            saveState();
        };

        const choicesDiv = box.querySelector(".choices");
        const hintDiv = box.querySelector(".hint");

        const indexedChoices = qObj.choices.map((c, i) => ({ text: c, index: i }));
        shuffle(indexedChoices);

        indexedChoices.forEach(choiceObj => {
            const btn = document.createElement("button");
            btn.className = "choice-btn";
            btn.textContent = choiceObj.text;

            btn.onclick = () => {
                const allBtns = choicesDiv.querySelectorAll("button");
                allBtns.forEach(b => b.disabled = true);

                if (choiceObj.index === qObj.answer) {
                    btn.classList.add("correct");
                    group.mark = 1;
                } else {
                    btn.classList.add("wrong");
                    group.mark = -1;

                    const correctBtn = [...allBtns].find(b =>
                        b.textContent === qObj.choices[qObj.answer]
                    );
                    if (correctBtn) correctBtn.classList.add("correct");
                }

                hintDiv.style.display = "block";
                hintDiv.textContent = "Hint: " + qObj.hint;

                markSpan.textContent =
                    group.mark === 1 ? "✔" :
                    group.mark === -1 ? "✖" :
                    "○";

                markSpan.style.color =
                    group.mark === 1 ? "green" :
                    group.mark === -1 ? "red" :
                    "grey";

                saveState();
            };

            choicesDiv.appendChild(btn);
        });

        box.querySelector(".try-btn").onclick = () => {
            currentIndex[groupIndex] = nextQuestionIndex(groupIndex);
            loadQuestions();
        };

        container.appendChild(box);
    });
}

// -------------------------
// LOAD LESSON DATA
// -------------------------
function loadLessonData(lessonId) {
    fetch("lesson" + lessonId + ".json")

        .then(res => res.json())
        .then(data => {
            document.getElementById("lessonTitle").textContent = data.title || "Lesson " + lessonId;

            groups = data.groups.map(g => ({
                mark: 0,
                flag: 0,
                questions: g.questions
            }));

            loadState();
            rebuildQueues();
            loadQuestions();

            const filterEl = document.getElementById("filter");
            if (filterEl) {
                filterEl.onchange = () => {
                    rebuildQueues();
                    loadQuestions();
                };
            }
        })
        .catch(err => {
            console.error("Error loading lesson JSON:", err);
        });
}
