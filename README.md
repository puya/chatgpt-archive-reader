# ChatGPT Archive Reader

A desktop application for reading and managing ChatGPT conversation archives exported from OpenAI.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## Features

- **Archive Loading**: Open ChatGPT conversation archives (JSON format)
- **Conversation Browser**: View all conversations in a sidebar with titles and dates
- **Message Display**: Read full conversation threads with proper formatting
- **Tagging System**: Add custom tags to conversations for organization
- **Search Functionality**: Search through conversation content
- **Tag Filtering**: Filter conversations by tags
- **Persistent Tags**: Tags are automatically saved alongside your archive files

## How to Run

### Prerequisites
- Node.js installed
- npm package manager

### Installation
```bash
npm install
```

### Start the App
```bash
npm start
```

This will launch the Electron desktop application.

## Installation

### From Source (Development)
```bash
git clone https://github.com/yourusername/chatgpt-archive-reader.git
cd chatgpt-archive-reader
npm install
npm start
```

### Pre-built Releases

Download the latest version directly:

- [**macOS**](https://github.com/puya/chatgpt-archive-reader/releases/latest/download/ChatGPT-Archive-Reader-mac.dmg) - DMG installer (~150MB)
- [**Windows**](https://github.com/puya/chatgpt-archive-reader/releases/latest/download/ChatGPT-Archive-Reader-win.exe) - EXE installer (~100MB)
- [**Linux**](https://github.com/puya/chatgpt-archive-reader/releases/latest/download/ChatGPT-Archive-Reader-linux.AppImage) - AppImage (~95MB)

Or visit the [Releases](https://github.com/puya/chatgpt-archive-reader/releases) page for all versions.

#### Installation Instructions
- **macOS**: Download the `.dmg` file, mount it, and drag the app to Applications
- **Windows**: Download the `.exe` installer and run it
- **Linux**: Download the `.AppImage` file, make it executable (`chmod +x filename.AppImage`), and run it

## Usage

### Getting Your ChatGPT Data
1. Go to [ChatGPT Settings](https://chat.openai.com/#settings)
2. Click "Data Controls" → "Export Data"
3. Download your data archive (this may take some time)
4. Extract the downloaded ZIP file
5. Look for `conversations.json` in the extracted folder

### Opening an Archive
1. Launch the ChatGPT Archive Reader app
2. Click the "Open JSON File" button
3. Select the `conversations.json` file from your extracted ChatGPT data
4. The app will load and display all conversations in the sidebar

### Browsing Conversations
- Conversations are listed in the left sidebar with title and date
- Click on any conversation to view its full content in the main area
- Messages are displayed with "You" and "ChatGPT" labels
- Content supports markdown formatting

### Tagging Conversations
1. Click on a conversation to select it
2. In the tag area, type a tag name in the input field
3. Press Enter or click "Add Tag"
4. Tags appear as removable chips below the input
5. Tags are automatically saved to a `_tags.json` file alongside your archive

### Searching
- Use the search bar at the top to search through conversation content
- Search highlights matching text in yellow
- Results are filtered in real-time as you type

### Filtering by Tags
- Tag buttons appear below the search bar once tags are created
- Click "All" to show all conversations
- Click any tag button to filter conversations that have that tag

## ChatGPT Archive Structure

When you export your ChatGPT data, you'll receive a ZIP file containing:

- **`conversations.json`** - Main file containing all your conversation data (use this with the app)
- **`user.json`** - Your account information
- **`conversations/`** - Directory with additional conversation metadata
- **`media/`** - Directory containing images, audio files, and other media you uploaded to ChatGPT

### Expected JSON Structure

The `conversations.json` file contains an array of conversation objects with this structure:
```json
[
  {
    "title": "Conversation Title",
    "create_time": 1702419091.925411,
    "update_time": 1702520034.479659,
    "mapping": {
      // Message tree structure
    }
  }
]
```

## Tag Storage

Tags are stored in a separate file with the same name as your archive but with `_tags.json` appended. For example:
- `conversations.json` → `conversations_tags.json`

Tag format:
```json
{
  "0": ["tag1", "tag2"],
  "5": ["important"]
}
```

Where the keys are conversation indices and values are arrays of tag strings.

## Building for Distribution

### Build for current platform
```bash
npm run build
```

### Deploy (publish to GitHub releases)
```bash
npm run deploy
```

## Technical Details

- Built with Electron for cross-platform desktop support
- Uses Marked.js for markdown rendering
- IPC communication between main and renderer processes
- File system operations for reading archives and managing tags

## Troubleshooting

- **App won't start**: Ensure Node.js and npm are installed, run `npm install` to install dependencies
- **File won't open**: Verify the JSON file is a valid ChatGPT export with the expected structure
- **Tags not saving**: Check file permissions in the archive directory
- **Search not working**: Ensure you're searching within conversation content, not titles

## Contributing

Contributions are welcome! Please see our [Contributing Guide](CONTRIBUTING.md) for details on how to get started.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
