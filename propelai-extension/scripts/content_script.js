// This script runs only when injected by the Service Worker after a user action (e.g., clicking the extension icon)

/**
 * 1. Intelligent Text Extraction:
 * Attempts to find the main content block of the page, avoiding headers, footers, 
 * navigation, and sidebars. It prioritizes common semantic tags.
 */
function extractMainContentText() {
    // Priority 1: Semantic HTML tags common in articles/main content
    const selectors = [
        'main',
        'article',
        '.main-content',
        '.post-body',
        '.entry-content',
        '#content'
    ];

    let contentElement = null;

    // Look for the element matching any of the priority selectors
    for (const selector of selectors) {
        contentElement = document.querySelector(selector);
        if (contentElement) {
            break; // Found the best element, stop searching
        }
    }

    // Fallback: If no semantic tags are found, use the entire document body
    if (!contentElement) {
        contentElement = document.body;
    }

    // Extract text content and clean it up
    // .innerText is often better than .textContent as it respects visual formatting (like line breaks)
    let text = contentElement.innerText || contentElement.textContent || '';

    // Simple clean-up: remove excessive whitespace and leading/trailing spaces
    text = text.replace(/\s\s+/g, ' ').trim();

    return text;
}

/**
 * 2. Message Passing:
 * Sends the extracted text back to the Service Worker.
 */
function sendTextToServiceWorker() {
    const textContent = extractMainContentText();
    const currentUrl = window.location.href;

    // We check if the text is long enough for the AI (matching the min 150 chars check in main.py)
    if (textContent.length < 150) {
        // Send a message to the Service Worker indicating failure
        chrome.runtime.sendMessage({
            action: "content_extraction_failure",
            message: "Content found is too short for effective AI analysis.",
            url: currentUrl
        });
        return;
    }

    // Send the extracted data to the Service Worker for processing
    chrome.runtime.sendMessage({
        action: "process_page_content",
        url: currentUrl,
        textContent: textContent
    });
}

// Execute the function when the script is injected
sendTextToServiceWorker();