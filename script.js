// ============================================================
// VIREXA AI — FRONTEND SCRIPT
// Speech Recognition + Gemini AI Evaluation
// Real Performance Scoring + Suggestions + Report + Analytics
// ============================================================

document.addEventListener("DOMContentLoaded", () => {

    // ========================================================
    // DOM ELEMENTS
    // ========================================================

    const startBtn =
        document.getElementById("startBtn");

    const stopBtn =
        document.getElementById("stopBtn");

    const nextQBtn =
        document.getElementById("nextQBtn");

    const difficultySelect =
        document.getElementById("difficulty");

    const questionText =
        document.getElementById("questionText");

    const transcriptBox =
        document.getElementById("transcriptBox");

    const analyzeBtn =
        document.getElementById("analyzeBtn");

    const clearTranscriptBtn =
        document.getElementById("clearTranscriptBtn");


    // -----------------------------
    // FEEDBACK METERS
    // -----------------------------

    const overallScore =
        document.getElementById("overallScore");

    const confidenceVal =
        document.getElementById("confidenceVal");

    const confidenceFill =
        document.getElementById("confidenceFill");

    const communicationVal =
        document.getElementById("communicationVal");

    const communicationFill =
        document.getElementById("communicationFill");

    const clarityVal =
        document.getElementById("clarityVal");

    const clarityFill =
        document.getElementById("clarityFill");


    // -----------------------------
    // SUGGESTIONS
    // -----------------------------

    const suggestionsBox =
        document.getElementById("suggestionsBox");

    const suggestionsList =
        document.getElementById("suggestionsList");


    // -----------------------------
    // REPORT
    // -----------------------------

    const fetchReportBtn =
        document.getElementById("fetchReportBtn");

    const reportArea =
        document.getElementById("reportArea");


    // -----------------------------
    // HERO
    // -----------------------------

    const tryDemoBtn =
        document.getElementById("tryDemoBtn");

    const learnMoreBtn =
        document.getElementById("learnMoreBtn");


    // -----------------------------
    // STATUS
    // -----------------------------

    const speechStatus =
        document.getElementById("speechStatus");

    const analysisStatus =
        document.getElementById("analysisStatus");


    // ========================================================
    // ANALYTICS ELEMENTS
    // ========================================================

    const analyticsCommunication =
        document.getElementById(
            "analyticsCommunication"
        );

    const analyticsCommunicationBar =
        document.getElementById(
            "analyticsCommunicationBar"
        );

    const analyticsTechnical =
        document.getElementById(
            "analyticsTechnical"
        );

    const analyticsTechnicalBar =
        document.getElementById(
            "analyticsTechnicalBar"
        );

    const analyticsRelevance =
        document.getElementById(
            "analyticsRelevance"
        );

    const analyticsRelevanceBar =
        document.getElementById(
            "analyticsRelevanceBar"
        );

    const analyticsClarity =
        document.getElementById(
            "analyticsClarity"
        );

    const analyticsClarityBar =
        document.getElementById(
            "analyticsClarityBar"
        );


    // ========================================================
    // STATE
    // ========================================================

    let recognition = null;

    let isListening = false;

    let shouldListen = false;

    let currentQuestionIndex = 0;

    let currentDifficulty = "basic";

    let recognitionRestartTimer = null;

    // IMPORTANT:
    // Actual spoken answer is stored here
    let finalTranscript = "";

    // Temporary live speech
    let interimTranscript = "";

    let latestEvaluation = null;


    // ========================================================
    // QUESTIONS
    // ========================================================

    const questions = {

        basic: [
            "Tell me about yourself.",
            "What are your strengths?",
            "What is one weakness you are working on?",
            "Why should we hire you?",
            "Where do you see yourself in five years?",
            "Why do you want to join our company?",
            "Tell me about your educational background.",
            "What motivates you to learn new technologies?",
            "Tell me about a challenge you faced and how you handled it.",
            "What are your career goals?"
        ],

        intermediate: [
            "Tell me about your major academic or personal project.",
            "Which technologies are you most comfortable working with?",
            "Describe a difficult technical problem you solved.",
            "How do you handle pressure and deadlines?",
            "Tell me about a time you worked successfully in a team.",
            "How do you learn a new technology?",
            "How do you approach debugging a program?",
            "Tell me about a disagreement you had while working in a team.",
            "How do you prioritize multiple tasks?",
            "What makes you different from other candidates?"
        ],

        advanced: [
            "How would you design a scalable web application?",
            "How would you troubleshoot a slow API?",
            "When would you choose SQL over NoSQL?",
            "How would you secure a REST API?",
            "Explain the main principles of object-oriented programming.",
            "How would you design a real-time notification system?",
            "What happens when you enter a URL into a browser?",
            "How would you investigate a production issue?",
            "Explain horizontal scaling versus vertical scaling.",
            "How would you design an AI-powered interview system?"
        ]
    };


    // ========================================================
    // STATUS
    // ========================================================

    function showStatus(
        message,
        type = "info"
    ) {

        if (!analysisStatus) {
            return;
        }

        analysisStatus.textContent =
            message;

        analysisStatus.className =
            `analysis-status ${type}`;
    }


    function clearStatus() {

        if (!analysisStatus) {
            return;
        }

        analysisStatus.textContent =
            "";

        analysisStatus.className =
            "analysis-status";
    }


    // ========================================================
    // SCORE NORMALIZATION
    // ========================================================

    function normalizeScore(value) {

        const number =
            Number(value);

        if (!Number.isFinite(number)) {
            return 0;
        }

        return Math.max(
            0,
            Math.min(
                100,
                Math.round(number)
            )
        );
    }


    // ========================================================
    // METER
    // ========================================================

    function setMeter(
        fillElement,
        valueElement,
        value
    ) {

        const safeValue =
            normalizeScore(value);


        if (fillElement) {

            fillElement.style.width =
                `${safeValue}%`;
        }


        if (valueElement) {

            valueElement.textContent =
                `${safeValue}%`;
        }
    }


    // ========================================================
    // RESET METERS
    // ========================================================

    function resetMeters() {

        setMeter(
            confidenceFill,
            confidenceVal,
            0
        );

        setMeter(
            communicationFill,
            communicationVal,
            0
        );

        setMeter(
            clarityFill,
            clarityVal,
            0
        );


        if (overallScore) {

            overallScore.textContent =
                "—";
        }


        updateAnalytics(
            0,
            0,
            0,
            0
        );
    }


    // ========================================================
    // QUESTION MANAGEMENT
    // ========================================================

    function getCurrentQuestions() {

        return (
            questions[currentDifficulty] ||
            questions.basic
        );
    }


    function setQuestion(index = 0) {

        const currentQuestions =
            getCurrentQuestions();


        if (!currentQuestions.length) {
            return;
        }


        currentQuestionIndex =
            index %
            currentQuestions.length;


        if (questionText) {

            questionText.textContent =
                currentQuestions[
                    currentQuestionIndex
                ];
        }


        // Reset answer
        finalTranscript = "";

        interimTranscript = "";

        latestEvaluation = null;


        if (transcriptBox) {

            transcriptBox.textContent =
                "Your spoken answer will appear here...";
        }


        resetMeters();

        hideSuggestions();

        clearStatus();


        if (speechStatus) {

            speechStatus.textContent =
                "Microphone ready";
        }
    }


    function nextQuestion() {

        const currentQuestions =
            getCurrentQuestions();


        currentQuestionIndex =
            (
                currentQuestionIndex +
                1
            ) %
            currentQuestions.length;


        setQuestion(
            currentQuestionIndex
        );


        showStatus(
            "New interview question loaded.",
            "info"
        );
    }


    // ========================================================
    // SPEECH RECOGNITION
    // ========================================================

    function initializeSpeechRecognition() {

        const SpeechRecognition =
            window.SpeechRecognition ||
            window.webkitSpeechRecognition;


        // Browser support check
        if (!SpeechRecognition) {

            if (speechStatus) {

                speechStatus.textContent =
                    "Speech Recognition is not supported. Please use Chrome or Edge.";
            }


            showStatus(
                "❌ Speech Recognition is not supported in this browser. Please use Google Chrome or Microsoft Edge.",
                "error"
            );


            return null;
        }


        const instance =
            new SpeechRecognition();


        // ----------------------------------------------------
        // IMPORTANT SETTINGS
        // ----------------------------------------------------

        // false = browser gives stable sessions
        // and we restart them automatically.
        instance.continuous =
            false;

        // Show words while user is speaking
        instance.interimResults =
            true;

        instance.maxAlternatives =
            1;

        // English - India
        instance.lang =
            "en-IN";


        // ====================================================
        // ON START
        // ====================================================

        instance.onstart =
            () => {

                isListening =
                    true;


                updateListeningUI(
                    true
                );


                showStatus(
                    "🎤 Listening... Speak your answer.",
                    "listening"
                );


                if (transcriptBox) {

                    const currentText =
                        finalTranscript.trim();


                    transcriptBox.textContent =
                        currentText ||
                        "Listening...";
                }
            };


        // ====================================================
        // ON RESULT
        // ====================================================

        instance.onresult =
            (event) => {

                interimTranscript =
                    "";


                for (
                    let i =
                        event.resultIndex;

                    i <
                    event.results.length;

                    i++
                ) {

                    const result =
                        event.results[i];


                    const spokenText =
                        result[0]?.transcript ||
                        "";


                    if (
                        result.isFinal
                    ) {

                        finalTranscript +=
                            spokenText + " ";

                    } else {

                        interimTranscript +=
                            spokenText;
                    }
                }


                const finalText =
                    finalTranscript.trim();


                const liveText =
                    interimTranscript.trim();


                const combinedText =
                    `${finalText} ${liveText}`.trim();


                // ------------------------------------------------
                // REAL TRANSCRIPT DISPLAY
                // ------------------------------------------------

                if (transcriptBox) {

                    transcriptBox.textContent =
                        combinedText ||
                        "Listening...";
                }


                // User-visible status
                if (speechStatus) {

                    speechStatus.textContent =
                        combinedText
                            ? "🎤 Capturing your answer..."
                            : "🎤 Listening...";
                }
            };


        // ====================================================
        // ON END
        // ====================================================

        instance.onend =
            () => {

                isListening =
                    false;


                updateListeningUI(
                    false
                );


                // If user is still in interview,
                // automatically start another recognition session.
                if (
                    shouldListen
                ) {

                    clearTimeout(
                        recognitionRestartTimer
                    );


                    recognitionRestartTimer =
                        setTimeout(
                            () => {

                                if (
                                    shouldListen &&
                                    !isListening
                                ) {

                                    startSpeechRecognition();
                                }

                            },
                            300
                        );


                    return;
                }


                // ------------------------------------------------
                // FINAL STATE AFTER STOP
                // ------------------------------------------------

                if (
                    finalTranscript.trim()
                ) {

                    showStatus(
                        "✅ Answer captured. You can analyze it now.",
                        "success"
                    );

                } else {

                    showStatus(
                        "🎤 No answer captured yet.",
                        "info"
                    );
                }
            };


        // ====================================================
        // ON ERROR
        // ====================================================

        instance.onerror =
            (event) => {

                const errorType =
                    event.error;


                console.log(
                    "Speech Recognition:",
                    errorType
                );


                // -----------------------------------------------
                // PERMISSION
                // -----------------------------------------------

                if (
                    errorType ===
                    "not-allowed" ||
                    errorType ===
                    "service-not-allowed"
                ) {

                    shouldListen =
                        false;

                    isListening =
                        false;


                    updateListeningUI(
                        false
                    );


                    if (speechStatus) {

                        speechStatus.textContent =
                            "Microphone permission required";
                    }


                    showStatus(
                        "❌ Please allow microphone access in the browser and try again.",
                        "error"
                    );


                    return;
                }


                // -----------------------------------------------
                // NO SPEECH
                // -----------------------------------------------

                if (
                    errorType ===
                    "no-speech"
                ) {

                    if (speechStatus) {

                        speechStatus.textContent =
                            "🎤 Listening... Speak your answer.";
                    }


                    showStatus(
                        "🎤 I didn't detect speech. Please continue speaking.",
                        "info"
                    );


                    return;
                }


                // -----------------------------------------------
                // NETWORK
                // -----------------------------------------------

                if (
                    errorType ===
                    "network"
                ) {

                    showStatus(
                        "⚠️ Speech recognition service had a network issue. Retrying...",
                        "warning"
                    );


                    return;
                }


                // -----------------------------------------------
                // ABORTED
                // -----------------------------------------------

                if (
                    errorType ===
                    "aborted"
                ) {

                    return;
                }


                // -----------------------------------------------
                // OTHER
                // -----------------------------------------------

                showStatus(
                    `❌ Speech recognition error: ${errorType}`,
                    "error"
                );
            };


        return instance;
    }


    // ========================================================
    // START SPEECH RECOGNITION
    // ========================================================

    function startSpeechRecognition() {

        if (!recognition) {

            recognition =
                initializeSpeechRecognition();
        }


        if (!recognition) {
            return;
        }


        if (isListening) {
            return;
        }


        try {

            recognition.start();

        } catch (error) {

            console.log(
                "Speech recognition start skipped."
            );
        }
    }


    // ========================================================
    // STOP SPEECH RECOGNITION
    // ========================================================

    function stopSpeechRecognition() {

        shouldListen =
            false;


        clearTimeout(
            recognitionRestartTimer
        );


        if (recognition) {

            try {

                recognition.stop();

            } catch (error) {

                console.log(
                    "Recognition already stopped."
                );
            }
        }


        isListening =
            false;


        updateListeningUI(
            false
        );


        const answer =
            finalTranscript.trim();


        if (answer) {

            if (transcriptBox) {

                transcriptBox.textContent =
                    answer;
            }


            showStatus(
                "✅ Answer captured. You can analyze it now.",
                "success"
            );

        } else {

            showStatus(
                "Microphone stopped. No spoken answer was captured.",
                "info"
            );
        }
    }


    // ========================================================
    // LISTENING UI
    // ========================================================

    function updateListeningUI(
        listening
    ) {

        if (startBtn) {

            if (listening) {

                startBtn.classList.add(
                    "listening"
                );

            } else {

                startBtn.classList.remove(
                    "listening"
                );
            }
        }


        if (speechStatus) {

            speechStatus.textContent =
                listening
                    ? "🎤 Listening..."
                    : "Microphone ready";
        }
    }


    // ========================================================
    // START BUTTON
    // ========================================================

    if (startBtn) {

        startBtn.addEventListener(
            "click",
            () => {

                // Clicking Start while already listening
                // will stop the current recording.
                if (isListening) {

                    stopSpeechRecognition();

                    return;
                }


                currentDifficulty =
                    difficultySelect
                        ? difficultySelect.value
                        : "basic";


                // New answer
                finalTranscript =
                    "";

                interimTranscript =
                    "";

                latestEvaluation =
                    null;


                if (transcriptBox) {

                    transcriptBox.textContent =
                        "Listening...";
                }


                hideSuggestions();

                resetMeters();


                shouldListen =
                    true;


                if (speechStatus) {

                    speechStatus.textContent =
                        "🎤 Starting microphone...";
                }


                startSpeechRecognition();
            }
        );
    }


    // ========================================================
    // STOP BUTTON
    // ========================================================

    if (stopBtn) {

        stopBtn.addEventListener(
            "click",
            () => {

                stopSpeechRecognition();
            }
        );
    }


    // ========================================================
    // DIFFICULTY
    // ========================================================

    if (difficultySelect) {

        difficultySelect.addEventListener(
            "change",
            () => {

                currentDifficulty =
                    difficultySelect.value;


                currentQuestionIndex =
                    0;


                stopSpeechRecognition();

                setQuestion(
                    0
                );


                showStatus(
                    `Difficulty changed to ${currentDifficulty}.`,
                    "info"
                );
            }
        );
    }


    // ========================================================
    // NEXT QUESTION
    // ========================================================

    if (nextQBtn) {

        nextQBtn.addEventListener(
            "click",
            () => {

                stopSpeechRecognition();

                nextQuestion();
            }
        );
    }


    // ========================================================
    // CLEAR TRANSCRIPT
    // ========================================================

    if (clearTranscriptBtn) {

        clearTranscriptBtn.addEventListener(
            "click",
            () => {

                stopSpeechRecognition();


                finalTranscript =
                    "";

                interimTranscript =
                    "";

                latestEvaluation =
                    null;


                if (transcriptBox) {

                    transcriptBox.textContent =
                        "Your spoken answer will appear here...";
                }


                resetMeters();

                hideSuggestions();


                showStatus(
                    "Answer and analysis cleared.",
                    "info"
                );


                if (speechStatus) {

                    speechStatus.textContent =
                        "Microphone ready";
                }
            }
        );
    }


    // ========================================================
    // ANALYZE BUTTON
    // ========================================================

    if (analyzeBtn) {

        analyzeBtn.addEventListener(
            "click",
            analyzeAnswer
        );
    }


    // ========================================================
    // GEMINI ANALYSIS
    // ========================================================

    async function analyzeAnswer() {

        // ----------------------------------------------------
        // IMPORTANT:
        // Use the actual captured transcript first.
        // Do not accidentally send placeholder text.
        // ----------------------------------------------------

        const answer =
            finalTranscript.trim();


        if (!answer) {

            showStatus(
                "⚠️ Please speak your answer first. Your spoken words must appear in the transcript box.",
                "error"
            );


            return;
        }


        const question =
            questionText
                ? questionText.textContent.trim()
                : "";


        if (!question) {

            showStatus(
                "⚠️ No interview question is selected.",
                "error"
            );


            return;
        }


        const originalText =
            analyzeBtn
                ? analyzeBtn.textContent
                : "✦ Analyse Answer";


        if (analyzeBtn) {

            analyzeBtn.disabled =
                true;

            analyzeBtn.textContent =
                "🤖 Analyzing...";
        }


        showStatus(
            "🤖 Gemini is analyzing your answer...",
            "loading"
        );


        try {

            // =================================================
            // SEND ANSWER TO BACKEND
            // =================================================

            const response =
                await fetch(
                    "/api/evaluate",
                    {
                        method:
                            "POST",

                        headers: {
                            "Content-Type":
                                "application/json"
                        },

                        body:
                            JSON.stringify({
                                question,
                                answer
                            })
                    }
                );


            let data;


            try {

                data =
                    await response.json();

            } catch (jsonError) {

                throw new Error(
                    `Server returned an invalid response (${response.status}).`
                );
            }


            if (
                !response.ok ||
                !data.success
            ) {

                throw new Error(
                    data.error ||
                    data.message ||
                    `AI evaluation failed (${response.status}).`
                );
            }


            // =================================================
            // EVALUATION
            // =================================================

            const evaluation =
                data.evaluation ||
                {};


            latestEvaluation =
                evaluation;


            const aiScore =
                normalizeScore(
                    evaluation.score
                );


            const confidence =
                normalizeScore(
                    evaluation.confidence
                );


            const communication =
                normalizeScore(
                    evaluation.communication
                );


            const technicalAccuracy =
                normalizeScore(
                    evaluation.technicalAccuracy
                );


            const relevance =
                normalizeScore(
                    evaluation.relevance
                );


            // =================================================
            // CLARITY
            // =================================================

            const clarity =
                calculateClarity(
                    answer
                );


            // =================================================
            // OVERALL SCORE
            // =================================================

            if (overallScore) {

                overallScore.textContent =
                    aiScore;
            }


            // =================================================
            // METERS
            // =================================================

            setMeter(
                confidenceFill,
                confidenceVal,
                confidence
            );


            setMeter(
                communicationFill,
                communicationVal,
                communication
            );


            setMeter(
                clarityFill,
                clarityVal,
                clarity
            );


            // =================================================
            // ANALYTICS
            // =================================================

            updateAnalytics(
                communication,
                technicalAccuracy,
                relevance,
                clarity
            );


            // =================================================
            // SUGGESTIONS
            // =================================================

            showSuggestions(
                evaluation,
                aiScore,
                communication,
                technicalAccuracy,
                relevance,
                clarity
            );


            // =================================================
            // SAVE RESULT
            // =================================================

            const saveResult =
                await saveScore({

                    question:
                        question,

                    difficulty:
                        currentDifficulty,

                    aiScore:
                        aiScore,

                    confidence:
                        confidence,

                    stress:
                        calculateStress(
                            answer
                        ),

                    honesty:
                        clarity,

                    communication:
                        communication,

                    technicalAccuracy:
                        technicalAccuracy,

                    relevance:
                        relevance,

                    aiFeedback:
                        evaluation.feedback ||
                        "",

                    timestamp:
                        new Date().toISOString()
                });


            // =================================================
            // STATUS
            // =================================================

            if (
                saveResult.success
            ) {

                showStatus(
                    `✅ Gemini analysis completed. Overall Score: ${aiScore}% — result saved successfully.`,
                    "success"
                );

            } else {

                showStatus(
                    `✅ Gemini analysis completed. Overall Score: ${aiScore}%. ⚠️ Result could not be saved.`,
                    "warning"
                );
            }


            // =================================================
            // REFRESH PERFORMANCE TREND
            // =================================================

            await initPerformanceTrend();


        } catch (error) {

            console.error(
                "Gemini Analysis Error:",
                error
            );


            showStatus(
                `❌ ${
                    error.message ||
                    "Unable to analyze the answer."
                }`,
                "error"
            );

        } finally {

            if (analyzeBtn) {

                analyzeBtn.disabled =
                    false;

                analyzeBtn.textContent =
                    originalText;
            }
        }
    }


    // ========================================================
    // CLARITY
    // ========================================================

    function calculateClarity(
        text
    ) {

        const cleanText =
            String(text || "").trim();


        const words =
            cleanText
                .split(/\s+/)
                .filter(Boolean);


        if (!words.length) {
            return 0;
        }


        const fillerPattern =
            /\b(um+|uh+|like|you know|actually|basically|maybe|sort of|kind of)\b/gi;


        const fillerMatches =
            cleanText.match(
                fillerPattern
            ) || [];


        const fillerCount =
            fillerMatches.length;


        const wordCount =
            words.length;


        let score =
            88;


        score -=
            fillerCount * 5;


        if (
            wordCount < 15
        ) {

            score -= 12;
        }


        if (
            wordCount >= 40
        ) {

            score += 4;
        }


        if (
            wordCount >= 70
        ) {

            score += 4;
        }


        return normalizeScore(
            score
        );
    }


    // ========================================================
    // SIMPLE STRESS / DELIVERY HEURISTIC
    // Not medical or psychological detection.
    // ========================================================

    function calculateStress(
        text
    ) {

        const cleanText =
            String(text || "").trim();


        const fillerPattern =
            /\b(um+|uh+|like|you know|actually|basically|maybe)\b/gi;


        const fillerCount =
            (
                cleanText.match(
                    fillerPattern
                ) || []
            ).length;


        const wordCount =
            cleanText
                .split(/\s+/)
                .filter(Boolean)
                .length;


        let stress =
            45;


        stress +=
            fillerCount * 7;


        stress -=
            Math.min(
                20,
                wordCount / 40
            );


        return normalizeScore(
            stress
        );
    }


    // ========================================================
    // ANALYTICS
    // ========================================================

    function updateAnalytics(
        communication,
        technical,
        relevance,
        clarity
    ) {

        const communicationScore =
            normalizeScore(
                communication
            );

        const technicalScore =
            normalizeScore(
                technical
            );

        const relevanceScore =
            normalizeScore(
                relevance
            );

        const clarityScore =
            normalizeScore(
                clarity
            );


        // -----------------------------
        // VALUES
        // -----------------------------

        if (
            analyticsCommunication
        ) {

            analyticsCommunication.textContent =
                `${communicationScore}%`;
        }


        if (
            analyticsTechnical
        ) {

            analyticsTechnical.textContent =
                `${technicalScore}%`;
        }


        if (
            analyticsRelevance
        ) {

            analyticsRelevance.textContent =
                `${relevanceScore}%`;
        }


        if (
            analyticsClarity
        ) {

            analyticsClarity.textContent =
                `${clarityScore}%`;
        }


        // -----------------------------
        // BARS
        // -----------------------------

        if (
            analyticsCommunicationBar
        ) {

            analyticsCommunicationBar.style.width =
                `${communicationScore}%`;
        }


        if (
            analyticsTechnicalBar
        ) {

            analyticsTechnicalBar.style.width =
                `${technicalScore}%`;
        }


        if (
            analyticsRelevanceBar
        ) {

            analyticsRelevanceBar.style.width =
                `${relevanceScore}%`;
        }


        if (
            analyticsClarityBar
        ) {

            analyticsClarityBar.style.width =
                `${clarityScore}%`;
        }
    }


    // ========================================================
    // SUGGESTIONS
    // ========================================================

    function showSuggestions(
        evaluation,
        aiScore,
        communication,
        technicalAccuracy,
        relevance,
        clarity
    ) {

        if (
            !suggestionsBox ||
            !suggestionsList
        ) {

            return;
        }


        suggestionsList.innerHTML =
            "";


        addSuggestionItem(
            `🎯 Overall AI Score: ${aiScore}%`,
            "score"
        );


        addSuggestionItem(
            `💬 Communication: ${communication}%`,
            "score"
        );


        addSuggestionItem(
            `🧠 Technical Accuracy: ${technicalAccuracy}%`,
            "score"
        );


        addSuggestionItem(
            `🎯 Relevance: ${relevance}%`,
            "score"
        );


        addSuggestionItem(
            `💡 Answer Clarity: ${clarity}%`,
            "score"
        );


        // -----------------------------
        // STRENGTHS
        // -----------------------------

        if (
            Array.isArray(
                evaluation.strengths
            ) &&
            evaluation.strengths.length
        ) {

            addSuggestionItem(
                "✨ Strengths",
                "heading"
            );


            evaluation.strengths
                .slice(0, 5)
                .forEach(
                    strength => {

                        addSuggestionItem(
                            `✓ ${strength}`,
                            "positive"
                        );
                    }
                );
        }


        // -----------------------------
        // IMPROVEMENTS
        // -----------------------------

        if (
            Array.isArray(
                evaluation.improvements
            ) &&
            evaluation.improvements.length
        ) {

            addSuggestionItem(
                "🚀 Areas to Improve",
                "heading"
            );


            evaluation.improvements
                .slice(0, 5)
                .forEach(
                    improvement => {

                        addSuggestionItem(
                            `→ ${improvement}`,
                            "improvement"
                        );
                    }
                );
        }


        // -----------------------------
        // AI FEEDBACK
        // -----------------------------

        if (
            evaluation.feedback
        ) {

            addSuggestionItem(
                `🤖 ${evaluation.feedback}`,
                "feedback"
            );
        }


        suggestionsBox.style.display =
            "block";
    }


    function addSuggestionItem(
        text,
        type = "default"
    ) {

        const item =
            document.createElement(
                "li"
            );


        item.textContent =
            text;


        item.dataset.type =
            type;


        suggestionsList.appendChild(
            item
        );
    }


    function hideSuggestions() {

        if (suggestionsBox) {

            suggestionsBox.style.display =
                "none";
        }


        if (suggestionsList) {

            suggestionsList.innerHTML =
                "";
        }
    }


    // ========================================================
    // SAVE SCORE
    // ========================================================

    async function saveScore(
        scoreData
    ) {

        try {

            const response =
                await fetch(
                    "/api/score",
                    {
                        method:
                            "POST",

                        headers: {
                            "Content-Type":
                                "application/json"
                        },

                        body:
                            JSON.stringify(
                                scoreData
                            )
                    }
                );


            let result =
                {};


            try {

                result =
                    await response.json();

            } catch (error) {

                return {
                    success: false
                };
            }


            if (
                !response.ok ||
                !result.success
            ) {

                console.warn(
                    "Score save failed:",
                    result
                );


                return {
                    success: false
                };
            }


            return {
                success: true
            };


        } catch (error) {

            console.warn(
                "Score save error:",
                error
            );


            return {
                success: false
            };
        }
    }


    // ========================================================
    // REPORT BUTTON
    // ========================================================

    if (fetchReportBtn) {

        fetchReportBtn.addEventListener(
            "click",
            fetchReport
        );
    }


    // ========================================================
    // FETCH REPORT
    // ========================================================

    async function fetchReport() {

        if (!reportArea) {
            return;
        }


        const originalText =
            fetchReportBtn
                ? fetchReportBtn.textContent
                : "";


        if (fetchReportBtn) {

            fetchReportBtn.disabled =
                true;

            fetchReportBtn.textContent =
                "📊 Loading Report...";
        }


        reportArea.innerHTML = `

            <div class="report-placeholder">

                <span>
                    V
                </span>

                <p>
                    Loading your report...
                </p>

            </div>

        `;


        try {

            const [
                summaryResponse,
                scoresResponse
            ] =
                await Promise.all([

                    fetch(
                        "/api/summary"
                    ),

                    fetch(
                        "/api/scores"
                    )
                ]);


            if (
                !summaryResponse.ok ||
                !scoresResponse.ok
            ) {

                throw new Error(
                    "Unable to fetch report data from the server."
                );
            }


            const summaryData =
                await summaryResponse.json();


            const scoresData =
                await scoresResponse.json();


            const summary =
                summaryData.summary ||
                summaryData;


            const scores =
                Array.isArray(
                    scoresData
                )
                    ? scoresData
                    : (
                        scoresData.scores ||
                        []
                    );


            displayReport(
                summary,
                scores
            );


        } catch (error) {

            console.error(
                "Report error:",
                error
            );


            reportArea.innerHTML = `

                <div class="report-placeholder report-error">

                    <span>
                        !
                    </span>

                    <p>
                        ${escapeHtml(
                            error.message
                        )}
                    </p>

                </div>

            `;


        } finally {

            if (fetchReportBtn) {

                fetchReportBtn.disabled =
                    false;

                fetchReportBtn.textContent =
                    originalText ||
                    "View Interview Report →";
            }
        }
    }


    // ========================================================
    // DISPLAY REPORT
    // ========================================================

    function displayReport(
        summary,
        scores
    ) {

        if (!reportArea) {
            return;
        }


        const scoreList =
            Array.isArray(scores)
                ? scores
                : [];


        const totalAttempts =
            scoreList.length;


        const averageScore =
            totalAttempts

                ? scoreList.reduce(
                    (
                        total,
                        item
                    ) => {

                        return (
                            total +
                            Number(
                                item.aiScore ||
                                item.score ||
                                0
                            )
                        );
                    },
                    0
                ) /
                totalAttempts

                : Number(
                    summary?.averageScore ||
                    0
                );


        const highestScore =
            scoreList.length

                ? Math.max(
                    ...scoreList.map(
                        item =>
                            Number(
                                item.aiScore ||
                                item.score ||
                                0
                            )
                    )
                )

                : Number(
                    summary?.highestScore ||
                    0
                );


        const latest =
            scoreList.length
                ? scoreList[
                    scoreList.length - 1
                ]
                : null;


        reportArea.innerHTML = `

            <div class="report-card">

                <div class="report-header">

                    <span class="panel-label">
                        AI INTERVIEW REPORT
                    </span>

                    <h3>
                        Performance Overview
                    </h3>

                </div>


                <div class="report-grid">

                    <div class="report-stat">

                        <span>
                            Total Attempts
                        </span>

                        <strong>
                            ${totalAttempts}
                        </strong>

                    </div>


                    <div class="report-stat">

                        <span>
                            Average Score
                        </span>

                        <strong>
                            ${Math.round(
                                averageScore
                            )}%
                        </strong>

                    </div>


                    <div class="report-stat">

                        <span>
                            Highest Score
                        </span>

                        <strong>
                            ${Math.round(
                                highestScore
                            )}%
                        </strong>

                    </div>


                    ${
                        latest
                            ? `
                                <div class="report-stat">

                                    <span>
                                        Latest Score
                                    </span>

                                    <strong>
                                        ${Math.round(
                                            Number(
                                                latest.aiScore ||
                                                latest.score ||
                                                0
                                            )
                                        )}%
                                    </strong>

                                </div>
                            `
                            : ""
                    }

                </div>


                ${
                    latest
                        ? `
                            <div class="latest-report">

                                <h4>
                                    Latest Interview
                                </h4>

                                <p>
                                    ${escapeHtml(
                                        latest.question ||
                                        "Interview question"
                                    )}
                                </p>

                                <span>
                                    ${
                                        latest.difficulty ||
                                        "Interview"
                                    }
                                </span>

                            </div>
                        `
                        : `
                            <div class="latest-report">

                                <p>
                                    Complete an interview answer to build your report.
                                </p>

                            </div>
                        `
                }

            </div>

        `;
    }


    // ========================================================
    // PERFORMANCE TREND
    // ========================================================

    async function initPerformanceTrend() {

        const analyticsCard =
            document.querySelector(
                ".analytics-card.large"
            );


        if (!analyticsCard) {
            return;
        }


        const oldTrend =
            analyticsCard.querySelector(
                ".performance-trend"
            );


        if (oldTrend) {

            oldTrend.remove();
        }


        const bars =
            analyticsCard.querySelector(
                ".bars"
            );


        if (!bars) {
            return;
        }


        const trend =
            document.createElement(
                "div"
            );


        trend.className =
            "performance-trend";


        trend.innerHTML = `

            <div class="performance-trend-head">

                <div>

                    <strong>
                        Performance Trend
                    </strong>

                    <span>
                        Saved interview score journey
                    </span>

                </div>

                <div class="performance-trend-badge">
                    LIVE DATA
                </div>

            </div>


            <div class="performance-chart"></div>


            <div class="performance-trend-note">
                Based on saved AI interview scores.
            </div>

        `;


        bars.parentNode.insertBefore(
            trend,
            bars
        );


        const chart =
            trend.querySelector(
                ".performance-chart"
            );


        try {

            const response =
                await fetch(
                    "/api/scores"
                );


            if (!response.ok) {

                throw new Error(
                    "Could not load score history."
                );
            }


            const data =
                await response.json();


            const scores =
                Array.isArray(
                    data.scores
                )
                    ? data.scores
                    : [];


            const values =
                scores

                    .map(
                        item =>
                            Number(
                                item.aiScore ||
                                item.score ||
                                0
                            )
                    )

                    .filter(
                        value =>
                            Number.isFinite(
                                value
                            )
                    );


            if (
                values.length < 2
            ) {

                chart.innerHTML = `

                    <div class="performance-empty">

                        <div>

                            <strong
                                style="
                                    display:block;
                                    color:#fff;
                                    font-size:11px;
                                    margin-bottom:4px;
                                "
                            >
                                ${
                                    values.length === 1
                                        ? "One interview saved"
                                        : "No trend data yet"
                                }
                            </strong>

                            <span>
                                ${
                                    values.length === 1
                                        ? "Complete one more interview to see your improvement line."
                                        : "Complete interviews to generate your performance trend."
                                }
                            </span>

                        </div>

                    </div>

                `;


                return;
            }


            const recent =
                values.slice(-8);


            const width =
                760;

            const height =
                150;

            const padX =
                24;

            const padY =
                18;


            const minScore =
                Math.max(
                    0,
                    Math.min(
                        ...recent
                    ) - 10
                );


            const maxScore =
                Math.min(
                    100,
                    Math.max(
                        ...recent
                    ) + 10
                );


            const range =
                Math.max(
                    1,
                    maxScore -
                    minScore
                );


            const points =
                recent.map(
                    (
                        value,
                        index
                    ) => {

                        const x =
                            padX +
                            (
                                index *
                                (
                                    width -
                                    padX * 2
                                )
                            ) /
                            (
                                recent.length -
                                1
                            );


                        const y =
                            height -
                            padY -
                            (
                                (
                                    value -
                                    minScore
                                ) /
                                range
                            ) *
                            (
                                height -
                                padY * 2
                            );


                        return {
                            x,
                            y,
                            value,
                            index
                        };
                    }
                );


            const linePath =
                points

                    .map(
                        (
                            point,
                            index
                        ) =>

                            `${
                                index === 0
                                    ? "M"
                                    : "L"
                            }${
                                point.x.toFixed(2)
                            } ${
                                point.y.toFixed(2)
                            }`
                    )

                    .join(" ");


            const areaPath =
                `${linePath}
                 L ${
                    points[
                        points.length - 1
                    ].x.toFixed(2)
                 } ${
                    height - padY
                 }
                 L ${
                    points[0].x.toFixed(2)
                 } ${
                    height - padY
                 }
                 Z`;


            const gridLines =
                [0,1,2,3,4]

                    .map(
                        index => {

                            const y =
                                padY +
                                (
                                    index *
                                    (
                                        height -
                                        padY * 2
                                    )
                                ) /
                                4;


                            return `

                                <line
                                    class="chart-grid"
                                    x1="${padX}"
                                    y1="${y}"
                                    x2="${
                                        width -
                                        padX
                                    }"
                                    y2="${y}"
                                />

                            `;
                        }
                    )
                    .join("");


            const dots =
                points

                    .map(
                        point => `

                            <circle
                                class="chart-dot"
                                cx="${point.x}"
                                cy="${point.y}"
                                r="4"
                            >

                                <title>
                                    Attempt ${
                                        point.index + 1
                                    }:
                                    ${Math.round(
                                        point.value
                                    )}%
                                </title>

                            </circle>

                        `
                    )
                    .join("");


            const labels =
                points

                    .map(
                        point => `

                            <text
                                class="chart-label"
                                x="${point.x}"
                                y="${height - 4}"
                                text-anchor="middle"
                            >
                                A${point.index + 1}
                            </text>

                        `
                    )
                    .join("");


            chart.innerHTML = `

                <svg
                    viewBox="
                        0
                        0
                        ${width}
                        ${height}
                    "
                    role="img"
                    aria-label="Saved interview score trend"
                >

                    <defs>

                        <linearGradient
                            id="virexaChartGradient"
                            x1="0"
                            x2="1"
                            y1="0"
                            y2="0"
                        >

                            <stop
                                offset="0%"
                                stop-color="#8b5cf6"
                            />

                            <stop
                                offset="55%"
                                stop-color="#3b82f6"
                            />

                            <stop
                                offset="100%"
                                stop-color="#22d3ee"
                            />

                        </linearGradient>


                        <linearGradient
                            id="virexaAreaGradient"
                            x1="0"
                            x2="0"
                            y1="0"
                            y2="1"
                        >

                            <stop
                                offset="0%"
                                stop-color="rgba(139,92,246,.22)"
                            />

                            <stop
                                offset="100%"
                                stop-color="rgba(139,92,246,0)"
                            />

                        </linearGradient>

                    </defs>


                    ${gridLines}


                    <path
                        class="chart-area"
                        d="${areaPath}"
                    />


                    <path
                        class="chart-line"
                        d="${linePath}"
                        pathLength="1"
                    />


                    ${dots}


                    ${labels}

                </svg>

            `;

        } catch (error) {

            console.error(
                "Performance trend error:",
                error
            );


            chart.innerHTML = `

                <div class="performance-empty">

                    <span>
                        Trend unavailable
                    </span>

                </div>

            `;
        }
    }


    // ========================================================
    // TRY DEMO
    // ========================================================

    if (tryDemoBtn) {

        tryDemoBtn.addEventListener(
            "click",
            () => {

                const demoSection =
                    document.getElementById(
                        "demo"
                    );


                if (demoSection) {

                    demoSection.scrollIntoView({
                        behavior:
                            "smooth"
                    });
                }
            }
        );
    }


    // ========================================================
    // LEARN MORE
    // ========================================================

    if (learnMoreBtn) {

        learnMoreBtn.addEventListener(
            "click",
            () => {

                const section =
                    document.getElementById(
                        "intelligence"
                    );


                if (section) {

                    section.scrollIntoView({
                        behavior:
                            "smooth"
                    });
                }
            }
        );
    }


    // ========================================================
    // HTML ESCAPE
    // ========================================================

    function escapeHtml(
        value
    ) {

        return String(
            value ?? ""
        )
            .replace(
                /&/g,
                "&amp;"
            )
            .replace(
                /</g,
                "&lt;"
            )
            .replace(
                />/g,
                "&gt;"
            )
            .replace(
                /"/g,
                "&quot;"
            )
            .replace(
                /'/g,
                "&#039;"
            );
    }


    // ========================================================
    // INITIALIZATION
    // ========================================================

    currentDifficulty =
        difficultySelect
            ? difficultySelect.value
            : "basic";


    setQuestion(
        0
    );


    resetMeters();


    hideSuggestions();


    initPerformanceTrend();


    // ========================================================
    // SPEECH SUPPORT CHECK
    // ========================================================

    const speechSupported =
        Boolean(
            window.SpeechRecognition ||
            window.webkitSpeechRecognition
        );


    if (!speechSupported) {

        if (speechStatus) {

            speechStatus.textContent =
                "Speech Recognition is not supported. Please use Chrome or Edge.";
        }


        showStatus(
            "Please open Virexa AI in Google Chrome or Microsoft Edge for voice transcription.",
            "warning"
        );

    } else {

        if (speechStatus) {

            speechStatus.textContent =
                "Microphone ready";
        }
    }


    // ========================================================
    // CLEANUP
    // ========================================================

    window.addEventListener(
        "beforeunload",
        () => {

            shouldListen =
                false;


            clearTimeout(
                recognitionRestartTimer
            );


            if (recognition) {

                try {

                    recognition.stop();

                } catch (error) {

                    console.log(
                        "Recognition cleanup skipped."
                    );
                }
            }
        }
    );


    // ========================================================
    // READY
    // ========================================================

    console.log(
        "✅ Virexa AI initialized."
    );

    console.log(
        "🎤 Speech Recognition ready."
    );

    console.log(
        "🤖 Gemini AI evaluation ready."
    );

});