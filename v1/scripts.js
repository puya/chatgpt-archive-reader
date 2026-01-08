const { ipcRenderer } = require('electron');

let allMessages = [];
let projects = {};
let currentFilePath = null;
let tags = {};
let activeTag = null;
let activeProject = null;

function convertMarkdownToHTML(markdown) {
    return marked.parse(markdown);
}

function deriveProjectName(gizmoId, conversationTitles) {
    // Use the same logic as the CLI tool for better project name extraction
    const titles = Array.isArray(conversationTitles) ? conversationTitles : [conversationTitles].filter(Boolean);

    // Method 1: Look for explicit project names in titles
    const projectPatterns = [
        /^(.*?)\s*[:-]\s*Project/i,  // "Something - Project"
        /^Project\s*[:-]\s*(.*)$/i,  // "Project - Something"
        /^(.*?)\s+Project\s*$/i,     // "Something Project"
        /^(.*?)\s*&\s*(.*)$/i,       // "Brand & Theme" patterns
        /^(.*?)\s+(Plan|Planning|Strategy|Trip|Story|Stories)$/i,  // Common project suffixes
    ];

    for (const title of titles) {
        for (const pattern of projectPatterns) {
            const match = title.match(pattern);
            if (match) {
                let extractedName = '';
                if (match[1] && match[2]) {
                    // For patterns with two meaningful parts (like & or Trip/Story)
                    extractedName = `${match[1].trim()} ${match[2].trim()}`;
                } else if (match[1]) {
                    extractedName = match[1].trim();
                }

                if (extractedName && 3 <= extractedName.length && extractedName.length <= 50) {
                    // Clean up the name
                    extractedName = extractedName.replace(/['"]/g, ''); // Remove quotes
                    return extractedName;
                }
            }
        }
    }

    // Method 2: Check for titles that are clearly project names
    const projectTitles = titles.filter(title =>
        title && (title.toLowerCase().includes('plan') ||
                  title.toLowerCase().includes('strategy') ||
                  title.toLowerCase().includes('system') ||
                  title.toLowerCase().includes('platform') ||
                  title.toLowerCase().includes('app') ||
                  title.toLowerCase().includes('tool') ||
                  title.toLowerCase().includes('design') ||
                  title.toLowerCase().includes('development'))
    );

    if (projectTitles.length > 0) {
        return projectTitles[0];
    }

    // Method 3: Enhanced common theme detection
    if (titles.length > 1) {
        const titleWords = [];
        titles.slice(0, 10).forEach(title => {  // Check first 10 titles
            const words = title.toLowerCase().split(/\s+/)
                .filter(word => word.length > 2 &&
                       !['the', 'and', 'for', 'with', 'from', 'this', 'that', 'chat', 'new',
                        'how', 'what', 'why', 'when', 'where', 'who', 'can', 'will', 'should',
                        'are', 'but', 'not', 'all', 'one', 'had', 'has', 'was', 'were', 'you',
                        'your', 'they', 'their', 'our', 'its', 'his', 'her', 'our'].includes(word));
            titleWords.push(...words);
        });

        const wordCounts = {};
        titleWords.forEach(word => {
            wordCounts[word] = (wordCounts[word] || 0) + 1;
        });

        // Find distinctive words that appear in multiple titles
        const commonWords = Object.entries(wordCounts)
            .filter(([word, count]) => count >= Math.min(2, titles.length) && word.length > 2)
            .sort((a, b) => b[1] - a[1])  // Sort by frequency
            .map(([word]) => word);

        // Look for brand/product names that appear frequently
        const brandWords = commonWords.filter(word =>
            word.length > 3 && /^[a-zA-Z]+$/.test(word) && !['using', 'about', 'create', 'make'].includes(word)
        );

        if (brandWords.length >= 2) {
            // Combine most frequent brand words
            const topBrands = brandWords.slice(0, 2);
            return topBrands.join(' ').replace(/\b\w/g, l => l.toUpperCase());
        } else if (brandWords.length === 1 && commonWords.length >= 3) {
            // If we have one strong brand word and other common terms
            return brandWords[0].charAt(0).toUpperCase() + brandWords[0].slice(1);
        } else if (commonWords.length >= 2) {
            // Fallback to most common words
            const topWords = commonWords.slice(0, 2);
            return topWords.join(' ').replace(/\b\w/g, l => l.toUpperCase());
        }
    }

    // Method 4: Use the most descriptive title as fallback
    if (titles.length > 0) {
        const bestTitle = titles
            .filter(title => title && title.length > 10 && title.length < 40)
            .sort((a, b) => b.split(/\s+/).length - a.split(/\s+/).length)[0];

        if (bestTitle) {
            return bestTitle;
        }
    }

    // Fallback to a generic project name based on gizmo ID
    return `Project ${gizmoId.split('-').pop().substring(0, 8)}`;
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

function populateProjectsSidebar() {
    console.log('Populating hierarchical projects sidebar...');
    var projectList = document.getElementById('projectList');
    projectList.innerHTML = ''; // Clear existing projects

    // Add "All Conversations" option at the top
    var allConversationsDiv = document.createElement('div');
    allConversationsDiv.className = 'project all-conversations' + (activeProject === null ? ' active' : '');
    allConversationsDiv.innerHTML = `
        <div class='projectName'>📚 All Conversations</div>
        <div class='projectCount'>${allMessages.length}</div>
    `;
    allConversationsDiv.onclick = function() {
        filterByProject(null);
    };
    projectList.appendChild(allConversationsDiv);

    // Add projects (expandable)
    Object.values(projects).sort((a, b) => b.conversations.length - a.conversations.length).forEach(function(project) {
        var projectContainer = document.createElement('div');
        projectContainer.className = 'project-container';

        var projectDiv = document.createElement('div');
        projectDiv.className = 'project expandable' + (activeProject === project.id ? ' active expanded' : '');
        projectDiv.innerHTML = `
            <div class='projectHeader'>
                <span class='expandIcon'>${activeProject === project.id ? '▼' : '▶'}</span>
                <div class='projectName'>${project.name}</div>
                <div class='projectCount'>${project.conversations.length}</div>
            </div>
        `;

        // Create conversations list (initially hidden)
        var conversationsDiv = document.createElement('div');
        conversationsDiv.className = 'project-conversations' + (activeProject === project.id ? ' expanded' : '');

        project.conversations.forEach(function(conversation) {
            var convDiv = document.createElement('div');
            convDiv.className = 'project-conversation';
            convDiv.innerHTML = `
                <div class='conversationTitle'>${conversation.title}</div>
                <div class='conversationDate'>${conversation.date}</div>
            `;
            convDiv.onclick = function(e) {
                e.stopPropagation();
                displayMessage(conversation, conversation.originalIndex);
            };
            conversationsDiv.appendChild(convDiv);
        });

        // Toggle expansion
        projectDiv.onclick = function() {
            var isExpanded = projectDiv.classList.contains('expanded');
            if (isExpanded) {
                // Collapse this project
                filterByProject(null);
            } else {
                // Expand this project
                filterByProject(project.id);
            }
        };

        projectContainer.appendChild(projectDiv);
        projectContainer.appendChild(conversationsDiv);
        projectList.appendChild(projectContainer);
    });

    // Add separator
    var separator = document.createElement('div');
    separator.className = 'projects-separator';
    separator.innerHTML = '<hr>';
    projectList.appendChild(separator);

    // Add standalone conversations at the bottom
    var standaloneConversations = allMessages.filter(m => !m.gizmoId);
    if (standaloneConversations.length > 0) {
        var standaloneHeader = document.createElement('div');
        standaloneHeader.className = 'standalone-header';
        standaloneHeader.innerHTML = `<div class='projectName'>📄 Standalone Conversations</div>`;
        projectList.appendChild(standaloneHeader);

        standaloneConversations.forEach(function(conversation) {
            var convDiv = document.createElement('div');
            convDiv.className = 'standalone-conversation';
            convDiv.innerHTML = `
                <div class='conversationTitle'>${conversation.title}</div>
                <div class='conversationDate'>${conversation.date}</div>
            `;
            convDiv.onclick = function() {
                displayMessage(conversation, conversation.originalIndex);
            };
            projectList.appendChild(convDiv);
        });
    }

    console.log('Hierarchical projects sidebar populated successfully');
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
            document.getElementById('projectsContainer').style.display = 'block';
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
            return {
                title: title,
                date: date,
                text: text,
                role: 'user',
                originalIndex: index,
                gizmoId: conversation.gizmo_id,
                gizmoType: conversation.gizmo_type
            };
        });

        // Group conversations by gizmo_id (projects)
        projects = {};
        allMessages.forEach(function(message) {
            if (message.gizmoId) {
                if (!projects[message.gizmoId]) {
                    projects[message.gizmoId] = {
                        id: message.gizmoId,
                        conversations: [],
                        type: message.gizmoType,
                        titles: new Set()
                    };
                }
                projects[message.gizmoId].conversations.push(message);
                if (message.title) {
                    projects[message.gizmoId].titles.add(message.title);
                }
            }
        });

        // Now derive project names using all titles
        Object.values(projects).forEach(function(project) {
            project.name = deriveProjectName(project.id, Array.from(project.titles));
        });

        console.log('Conversations processed, populating sidebar...');
        console.log(`Found ${Object.keys(projects).length} projects`);
        populateSidebar(allMessages);
        populateProjectsSidebar();
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
    let filteredMessages = allMessages;

    // Apply project filter first
    if (activeProject === 'standalone') {
        filteredMessages = filteredMessages.filter(message => !message.gizmoId);
    } else if (activeProject) {
        filteredMessages = filteredMessages.filter(message => message.gizmoId === activeProject);
    }

    // Then apply tag filter
    if (tag) {
        filteredMessages = filteredMessages.filter((message) => tags[message.originalIndex] && tags[message.originalIndex].includes(tag));
    }

    populateSidebar(filteredMessages);
    updateTagFilter();
}

function filterByProject(projectId) {
    activeProject = projectId;
    filterMessagesByTag(activeTag);
    populateProjectsSidebar();
}

function filterMessages(searchTerm) {
    let filteredMessages = allMessages.filter(function(message) {
        return message.text.toLowerCase().includes(searchTerm.toLowerCase());
    });

    // Apply project filter
    if (activeProject === 'standalone') {
        filteredMessages = filteredMessages.filter(message => !message.gizmoId);
    } else if (activeProject) {
        filteredMessages = filteredMessages.filter(message => message.gizmoId === activeProject);
    }

    // Apply tag filter
    if (activeTag) {
        filteredMessages = filteredMessages.filter((message) => tags[message.originalIndex] && tags[message.originalIndex].includes(activeTag));
    }

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