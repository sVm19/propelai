// popup/popup.js

const generateButton = document.getElementById('generate-button');
const statusArea = document.getElementById('status-area');
const ideasContainer = document.getElementById('ideas-container');

// --- Helper Functions to Update the UI ---

function showStatus(message, type = 'loading') {
    statusArea.textContent = message;
    statusArea.className = `status-message status-${type}`;
    statusArea.style.display = 'block';
    ideasContainer.style.display = 'none';
}

function hideStatus() {
    statusArea.style.display = 'none';
}

function displayIdeas(ideas) {
    hideStatus();
    ideasContainer.innerHTML = '<h4>Generated Opportunities:</h4>'; // Clear previous ideas

    if (!ideas || ideas.length === 0) {
        showStatus('No ideas generated. Try a different page or check the API logs.', 'error');
        return;
    }

    ideas.forEach(idea => {
        const ideaHtml = `
            <div class="idea-card">
                <h4>${idea.Name}</h4>
                <p><span class="section-label">Problem:</span> ${idea.Problem}</p>
                <p><span class="section-label">Solution:</span> ${idea.Solution}</p>
            </div>
        `;
        ideasContainer.innerHTML += ideaHtml;
    });

    ideasContainer.style.display = 'block';
}

// --- Event Handlers ---

// 1. Trigger the process when the user clicks the button
generateButton.addEventListener('click', () => {
    showStatus("Analyzing page and contacting PropelAI backend...");
    generateButton.disabled = true; // Prevent multiple clicks

    // Send a message to the active tab to inject the content script.
    // The content script will then extract text and message the Service Worker.
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs.length > 0) {
            // Note: This injects the script defined in manifest.json (content_script.js)
            chrome.tabs.sendMessage(tabs[0].id, { action: "initiate_extraction" });
        }
    });
});

// 2. Listener for messages coming from the Service Worker
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    generateButton.disabled = false; // Re-enable button after process is complete (success or error)

    switch (request.action) {
        case 'processing_start':
            showStatus(request.data, 'loading');
            break;
        case 'display_ideas':
            displayIdeas(request.data);
            break;
        case 'display_error':
            showStatus(request.data, 'error');
            break;
        default:
            break;
    }
});