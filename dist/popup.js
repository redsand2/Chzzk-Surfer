"use strict";
document.addEventListener('DOMContentLoaded', () => {
    const searchButton = document.getElementById('searchButton');
    if (searchButton) {
        searchButton.addEventListener('click', () => {
            chrome.tabs.create({ url: 'surfer.html' });
        });
    }
});
