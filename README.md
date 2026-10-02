# Virexa AI — Intelligent Interview Coach

Virexa AI is an AI-based interview practice web application that helps students and job seekers practice interview questions, answer using their microphone, and get feedback on their answers.

I built this project to make interview practice more interactive instead of only reading questions and preparing answers.

The application combines browser speech recognition with Google Gemini for answer evaluation and stores interview results so performance can be viewed later.

---

## About the Project

The main idea behind Virexa AI is simple:

**Practice → Speak → Transcribe → Analyse → Improve**

A user can select an interview difficulty, start an interview, answer the question using their voice, see the spoken answer as text, and then submit that answer for Gemini evaluation.

The application then shows the results directly on the dashboard.

---

## What Virexa AI Can Do

### Interview Practice

The application provides interview questions in three difficulty levels:

- Basic
- Intermediate
- Advanced

Questions cover common HR questions as well as technical and project-related questions.

Examples include:

- Tell me about yourself.
- What are your strengths?
- Tell me about your project.
- How do you approach debugging a program?
- How would you design a scalable web application?
- How would you secure a REST API?

---

### Speech to Text

The interview answer can be given using the microphone.

Virexa AI uses the browser's Speech Recognition API to convert spoken words into text.

The transcript is displayed inside the **Live Transcript** section while the user is speaking.

The application also handles:

- microphone permission
- listening state
- speech recognition errors
- no-speech situations
- automatic recognition restart during an active interview
- final and interim speech results

For speech recognition, a supported browser such as Chrome or Edge should be used.

---

## Gemini AI Evaluation

After the answer has been captured, the user can click **Analyse Answer**.

The answer is sent to the backend and evaluated using Google Gemini.

Gemini returns structured evaluation data including:

- Overall Score
- Confidence
- Communication
- Technical Accuracy
- Relevance
- Strengths
- Areas for Improvement
- AI Feedback

The results are then displayed on the Virexa AI interface.

---

## Answer Clarity

Along with Gemini evaluation, the frontend also calculates a basic clarity score from the transcript.

The clarity calculation considers things such as:

- answer length
- filler words
- response structure

This is used as a simple response-analysis metric.

---

## Performance Analytics

After an answer is evaluated, the important performance values are shown in the analytics section.

The current analytics include:

- Communication
- Technical Accuracy
- Relevance
- Answer Clarity

The application also creates a **Performance Trend** from saved interview scores.

This allows multiple interview attempts to be viewed as a performance journey.

---

## Interview Report

Virexa AI stores completed interview evaluations in the project's score data.

The **View Interview Report** section can show:

- Total Attempts
- Average Score
- Highest Score
- Latest Score
- Latest Interview Question
- Interview Difficulty

This gives the user a quick overview of previous interview practice.

---

## User Interface

The project has been designed with a dark futuristic AI interface.

Some of the UI work completed in the project includes:

- Virexa AI branding
- AI-focused navigation
- glowing visual elements
- interview workspace
- live transcript panel
- AI engine visual section
- feedback cards
- performance analytics
- performance trend chart
- interview report section
- custom project images
- responsive layout for different screen sizes

The project uses images from the `images` folder for the interface and presentation sections.

---

## Technology Used

### Frontend

- HTML5
- CSS3
- JavaScript
- Web Speech Recognition API

### Backend

- Node.js
- Express.js
- REST API endpoints
- JSON-based score storage

### AI

- Google Gemini API
- `@google/genai`

### Environment

- dotenv
- `.env` for API key configuration

---

## How the Application Works

```text
User selects difficulty
        ↓
Interview question appears
        ↓
User clicks Start Interview
        ↓
Speech Recognition starts
        ↓
User speaks the answer
        ↓
Live transcript is generated
        ↓
User clicks Analyse Answer
        ↓
Answer is sent to Node.js backend
        ↓
Gemini evaluates the answer
        ↓
Scores and feedback are displayed
        ↓
Result is saved
        ↓
Analytics and performance trend are updated