BrightInterview — Local demo (Beginner friendly)
-----------------------------------------------

What is included:
- public/index.html (frontend)
- public/style.css (styles)
- public/script.js (frontend logic)
- server.js (Node/Express server to save scores)
- package.json (npm dependencies)
- scores.json (data file created after first run)

How to run locally (recommended):
1. Make sure you have Node.js installed (https://nodejs.org). Use version 14+.
2. Open terminal and go to the project folder where package.json is located.
3. Run: npm install
4. Run: npm start
5. Open browser: http://localhost:3000
6. Click <strong>Start</strong> and allow camera & microphone. Speak to generate transcript.
7. Click <strong>Analyze & Save</strong> to store the numeric scores on the server.
8. Use <strong>Report → Fetch Report</strong> to see average scores and improvement suggestions from the server.

Notes:
- For camera & mic to work on mobile or some browsers, use HTTPS or localhost.
- This is a prototype: it stores numeric scores only (no raw transcripts) to the server file scores.json.
- For production: add authentication, server-side validation, and a database.

 What it Does (Features):

This tool is designed to help you practice and improve your interview skills with real-time feedback.

-   **Live Transcript:** Uses the browser's speech API to show a live transcript of your answer as you speak.
-   **Real-Time Feedback:** Get instant scores for your **Confidence**, **Stress**, and **Honesty** as you practice.
-   **Analyze & Save:** Saves your numeric scores to a simple JSON backend for review.
-   **Beginner-Friendly UI:** A clean and simple interface that is easy to use for everyone.
-   **Simple Codebase:** Built with vanilla HTML, CSS, and JavaScript, making it easy to learn from and extend.