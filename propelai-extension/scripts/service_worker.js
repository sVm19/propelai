// This is the Service Worker (the background script), the brain of the extension.
// It listens for messages from the Content Script and communicates with the backend API.

// --- Configuration ---
// NOTE: For development, use localhost:8000. 
// Replace this with your secure HTTPS deployed domain for production!
const BACKEND_API_URL = 'https://your-public-render-url.onrender.com/generate';

/**
 * 1. Listener for Messages from Content Script
 * The Service Worker listens for the 'process_page_content' action.
 */
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    // Check if the message is the one we want to process
    if (request.action === "process_page_content") {

        // This function must return true to indicate an asynchronous response (fetch)
        processContent(request.url, request.textContent);
        return true;
    }

    // Handle the failure message sent by the Content Script
    if (request.action === "content_extraction_failure") {
        console.warn("Content extraction failed:", request.message);
        // We can send a message back to the popup to display the error
        sendMessageToPopup("display_error", request.message);
        return false;
    }
});


/**
 * 2. Communication with the Python Backend (FastAPI)
 * Sends the extracted text to your deployed API endpoint.
 */
async function processContent(url, textContent) {
    try {
        // Prepare the data to send to the FastAPI endpoint
        const payload = {
            url: url,
            text_content: textContent,
            // NOTE: user_id is hardcoded for now; Phase 3 will involve reading a stored ID.
            user_id: "anonymous_dev_user"
        };

        // Inform the popup that processing has started
        sendMessageToPopup("processing_start", "Analyzing page content...");

        const response = await fetch(BACKEND_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        const data = await response.json();

        if (!response.ok) {
            // Handle HTTP errors (e.g., 400 Bad Request, 500 Server Error)
            throw new Error(data.detail || 'API request failed with status: ' + response.status);
        }

        // 3. Success: Send the generated ideas back to the popup UI
        sendMessageToPopup("display_ideas", data.ideas);

    } catch (error) {
        console.error("Backend API Error:", error.message);
        sendMessageToPopup("display_error", "Error connecting to PropelAI API. Is the Python server running?");
    }
}

/**
 * Helper function to send messages to the popup UI.
 */
function sendMessageToPopup(action, data) {
    // Use the tabs query to find the currently active tab (where the popup is open)
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs.length > 0) {
            chrome.tabs.sendMessage(tabs[0].id, {
                action: action,
                data: data
            });
        }
    });
}