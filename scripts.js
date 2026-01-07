const { ipcRenderer } = require('electron');

let allMessages = [];
let currentFilePath = null;
let tags = {};
let activeTag = null;

function convertMarkdownToHTML(markdown) {
    return marked.parse(markdown);
}

function populateSidebar(messages) {
    console.log('Populating sidebar with messages...');
    var messageList = document.getElementById('messageList');
    messageList.innerHTML = ''; // Clear existing messages

    messages.forEach(function(message, index) {
        var messageDiv = document.createElement('div');
        messageDiv.className = 'message';
        messageDiv.innerHTML = `
            <div class='messageTitle'>${message.title}</div>
            <div class='messageDate'>${message.date}</div>
            <div class='tag-container' data-message-index="${message.originalIndex}"></div>
        `;
        messageDiv.onclick = function() {
            displayMessage(message, message.originalIndex);
        };
        messageList.appendChild(messageDiv);
    });
    updateAllMessageTags();
    console.log('Sidebar populated successfully');
}

function updateAllMessageTags() {
    document.querySelectorAll('.tag-container').forEach(container => {
        const index = parseInt(container.getAttribute('data-message-index'));
        updateMessageTagsInSidebar(index, container);
    });
}

function updateMessageTagsInSidebar(messageIndex, tagContainer) {
    tagContainer.innerHTML = ''; // Clear existing tags
    if (tags[messageIndex]) {
        tags[messageIndex].forEach(tag => {
            const tagSpan = document.createElement('span');
            tagSpan.className = 'tag';
            tagSpan.textContent = tag;
            tagContainer.appendChild(tagSpan);
        });
    }
}

function displayMessage(message, index) {
    var messageContent = document.getElementById('messageContent');
    var searchTerm = document.getElementById('searchBar').value;

    messageContent.innerHTML = `
        <div id="tagArea">
            <div id="messageTags"></div>
            <div id="addTags">
              <input type="text" id="newTagInput" placeholder="Add new tag...">
              <button id="addTagBtn">Add Tag</button>
            </div>
        </div>
        <div class="message-text">${convertMarkdownToHTML(highlightSearchTerm(message.text, searchTerm))}</div>
    `;

    var messageDivs = document.getElementsByClassName('message');
    for (var i = 0; i < messageDivs.length; i++) {
        messageDivs[i].classList.remove('active');
    }
    document.querySelector(`.message [data-message-index="${index}"]`).parentNode.classList.add('active');

    updateMessageTags(index);

    document.getElementById('addTagBtn').addEventListener('click', () => addTag(index));
    document.getElementById('newTagInput').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            addTag(index);
        }
    });

    var firstHighlight = messageContent.querySelector('.highlight');
    if (firstHighlight) {
        firstHighlight.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
}

function highlightSearchTerm(text, searchTerm) {
    if (!searchTerm) return text;
    const re = new RegExp(searchTerm, 'gi');
    return text.replace(re, match => `<span class="highlight">${match}</span>`);
}

async function openFile() {
    console.log('Opening file...');
    try {
        const result = await ipcRenderer.invoke('open-file');
        console.log('Received result:', result);
        if (result && !result.error) {
            currentFilePath = result.filePath;
            console.log('Processing conversations...');
            processConversations(result.content);
            console.log('Loading tags...');
            await loadTags();
            console.log('Updating UI...');
            document.getElementById('currentFilePath').textContent = currentFilePath;
            document.getElementById('searchContainer').style.display = 'block';
            console.log('File opened and processed successfully');
        } else if (result.error) {
            console.error('Error opening file:', result.error);
            alert('Error opening file: ' + result.error);
        }
    } catch (error) {
        console.error('Error in openFile:', error);
        alert('An error occurred while opening the file.');
    }
}

function processConversations(data) {
    console.log('Processing conversations...');
    try {
        allMessages = data.map(function(conversation, index) {
            var title = conversation.title;
            var date = new Date(conversation.create_time * 1000).toISOString().split('T')[0];
            var text = format_conversation_text_with_breaks(conversation.mapping);
            return { title: title, date: date, text: text, role: 'user', originalIndex: index };
        });
        console.log('Conversations processed, populating sidebar...');
        populateSidebar(allMessages);
    } catch (error) {
        console.error('Error processing conversations:', error);
        alert('Error processing conversations: ' + error.message);
    }
}

function format_conversation_text_with_breaks(mapping) {
    var formattedText = "";
    var initialBlankMessagesCount = 0;
    var isInitialPartOfConversation = true;

    Object.values(mapping).forEach(function(value) {
        var message = value.message;
        if (message && message.content && message.content.parts) {
            var contentParts = message.content.parts;
            var content = Array.isArray(contentParts) ? contentParts.join(' ') : contentParts;
            
            if (isInitialPartOfConversation && message.author.role === 'system' && content.trim() === '') {
                initialBlankMessagesCount++;
                if (initialBlankMessagesCount >= 2) {
                    isInitialPartOfConversation = false;
                }
                return;
            }

            var messageClass = message.author.role === 'user' ? 'user-msg' : 'chatgpt-msg';
            var label = message.author.role === 'user' ? 'You' : 'ChatGPT';
            
            formattedText += `<div class="message-wrapper ${messageClass}">`;
            formattedText += `<div class='${messageClass}-label'>${label}:</div>`;
            formattedText += `<div class='${messageClass}-content'>${content}</div>`;
            formattedText += `</div>`;
        }
    });
    return formattedText;
}

async function loadTags() {
    console.log('Loading tags...');
    try {
        tags = await ipcRenderer.invoke('load-tags', currentFilePath);
        console.log('Tags loaded:', tags);
        updateTagUI();
    } catch (error) {
        console.error('Error loading tags:', error);
    }
}

async function saveTags() {
    console.log('Saving tags...');
    try {
        await ipcRenderer.invoke('save-tags', { filePath: currentFilePath, tags: tags });
        console.log('Tags saved successfully');
    } catch (error) {
        console.error('Error saving tags:', error);
        alert('An error occurred while saving tags.');
    }
}

function addTag(messageIndex) {
    const newTagInput = document.getElementById('newTagInput');
    const tag = newTagInput.value.trim();
    
    if (tag) {
        console.log('Adding tag:', tag, 'to message:', messageIndex);
        
        if (!tags[messageIndex]) {
            tags[messageIndex] = [];
        }
        if (!tags[messageIndex].includes(tag)) {
            tags[messageIndex].push(tag);
            saveTags();
            updateMessageTags(messageIndex);
            updateTagUI();
            newTagInput.value = '';
        }
    } else {
        console.log('No tag entered');
    }
}

function updateMessageTags(messageIndex) {
    const messageTagsContainer = document.getElementById('messageTags');
    messageTagsContainer.innerHTML = '';

    if (tags[messageIndex]) {
        tags[messageIndex].forEach(tag => {
            const tagSpan = document.createElement('span');
            tagSpan.className = 'tag';
            tagSpan.textContent = tag;
            const removeButton = document.createElement('span');
            removeButton.className = 'remove-tag';
            removeButton.textContent = '×';
            removeButton.onclick = (e) => {
                e.stopPropagation();
                removeTag(messageIndex, tag);
            };
            tagSpan.appendChild(removeButton);
            messageTagsContainer.appendChild(tagSpan);
        });
    }
    updateAllMessageTags();
}

function removeTag(messageIndex, tagToRemove) {
    if (tags[messageIndex]) {
        tags[messageIndex] = tags[messageIndex].filter(tag => tag !== tagToRemove);
        saveTags();
        updateMessageTags(messageIndex);
        updateTagUI();
    }
}

function updateTagUI() {
    console.log('Updating tag UI');
    updateAllMessageTags();
    updateTagFilter();
}

function updateTagFilter() {
    const tagFilter = document.getElementById('tagFilter');
    tagFilter.innerHTML = '';
    
    const allButton = document.createElement('button');
    allButton.textContent = 'All';
    allButton.className = activeTag === null ? 'active' : '';
    allButton.onclick = () => filterMessagesByTag(null);
    tagFilter.appendChild(allButton);
    
    const allTags = new Set();
    Object.values(tags).forEach(messageTags => {
        messageTags.forEach(tag => allTags.add(tag));
    });
    
    allTags.forEach(tag => {
        const tagButton = document.createElement('button');
        tagButton.textContent = tag;
        tagButton.className = tag === activeTag ? 'active' : '';
        tagButton.onclick = () => filterMessagesByTag(tag);
        tagFilter.appendChild(tagButton);
    });
}

function filterMessagesByTag(tag) {
    activeTag = tag;
    const filteredMessages = tag
        ? allMessages.filter((message) => tags[message.originalIndex] && tags[message.originalIndex].includes(tag))
        : allMessages;
    populateSidebar(filteredMessages);
    updateTagFilter();
}

function filterMessages(searchTerm) {
    var filteredMessages = allMessages.filter(function(message) {
        return message.text.toLowerCase().includes(searchTerm.toLowerCase());
    });
    populateSidebar(filteredMessages);
}

window.onload = function() {
    console.log('Window loaded, initializing app...');
    document.getElementById('openFileBtn').addEventListener('click', openFile);

    var searchBar = document.getElementById('searchBar');
    searchBar.addEventListener('input', function() {
        filterMessages(searchBar.value);
    });

    console.log('App initialized successfully');
};